if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}



const puppeteer = require('puppeteer')
const fs = require('fs');
const meTimeUrl = "https://metime.mcdonalds.co.nz/Account?returnUrl=%2F#/Login";
const rosterURL = "https://peopleessentials.mcdonalds.co.nz/sections/myLearning/index.cfm";
const uploadToCalander = require('./calendar')
const date = require('./date')

let browser;

const createEvent = async (page) => {
    let rosters = await page.evaluate(() => [...document.querySelectorAll("tbody > tr")].map(el => {
        if(el.children[1].innerText.length == 0) {
            return null;
        }
        return {
            startDate: el.children[1].innerText,
            startTime: el.children[2].innerText,
            endTime: el.children[3].innerText,
            hours: el.children[4].innerText
        }
    }))
    rosters = rosters.filter(ev => ev !== null).map(ev => {
        const endDateTime = date.addHours(ev.startDate, ev.startTime, ev.endTime)
        return {
            'summary': 'McDonalds Queen St',
            'location': '260 Queen Street, Auckland CBD, Auckland 1010',
            'description': 'Work as hard as you can',
            'start': {
                'dateTime': date.formatDate(ev.startDate, ev.startTime),
                'timeZone': 'Pacific/Auckland',
            },
            'end': {
                'dateTime': endDateTime.tz("Pacific/Auckland").format(),
                'timeZone': 'Pacific/Auckland',
            }
        }
    })
    return rosters
}




async function loginToMeTime(page) {
    //email
	await page.waitForSelector("[name='UserName']");
    await page.type("[name='UserName']", process.env.ME_TIME_ID);

	//password
    await page.waitForSelector('input[type="password"]', { visible: true })
    await page.type('input[type="password"]', process.env.ME_TIME_PSSD)
    await page.click('[type="submit"]')

    await page.waitForNavigation({
        waitUntil: "load"
    })
}

async function navigateToRosters(page) {
    await page.waitForSelector(".icon-menu");
    await page.click('.icon-menu')
    await page.evaluate(() => {
		let btns = [...document.querySelector(".slideTab").querySelectorAll("a")];
		btns.forEach((btn) => {
			if (btn.innerText == "People Essentials")
                btn.click();
		});
	});
}


async function saveLastRoster(date) {
    return new Promise((resolve, reject) => {
        fs.writeFile("lastRoster.txt", date, (err) => {
            if(err) {
                reject("Could not save the roster!")
            }
            resolve()
        })
    })
}

async function readLastRoster() {
    return new Promise((resolve, reject) => {
        fs.readFile("lastRoster.txt", "utf8", (err, data) => {
            if(err) {
                reject("Something went wrong while reading the file")
            }
            resolve(data)
        })
    })
}

async function downloadRosters(target) {
    if(target.url() == rosterURL) {
        if (target.type() !== 'page') {
            return;
        } else {
            var page = await target.page();
        }
        await page.bringToFront()
        await page.waitForSelector(".myRosters")
        await page.click(".myRosters");
    

        await page.waitForSelector("a[title='Download Roster']")

        const rosters = await page.evaluate(() => [...document.querySelectorAll("tbody > tr")].map(el => el.children[1].innerText).filter(el => el.length !== 0))
        const latestRoster = rosters[rosters.length - 1]
        const savedLastestRoster = await readLastRoster()
        if(latestRoster !== savedLastestRoster) {
            await saveLastRoster(latestRoster);
            for(let i = 0; i < rosters.length; i++) {
                await page.click(".myRosters")
                await page.waitForSelector("a[title='Download Roster']")
                const links = await page.$$("a[title='Download Roster']")
                links[i].click()
                await page.waitForNavigation()
                let events = await createEvent(page)
                events = events.map(ev => ({...ev, summary: "Queen Street " + rosters[i]}))
                // console.log(events)
                await uploadToCalander(events)
            }
            console.log("New Rosters are added to your calander.")
            browser.close()
            return;
        }
        console.log("Your calander is already up to date as " + latestRoster)
        return;
    }
}


(async () => {
	browser = await puppeteer.launch({
        headless: true
    })

    browser.on("targetcreated", downloadRosters)
    
    const page = await browser.newPage()
    await page.goto(meTimeUrl, { waitUntil: 'networkidle2' });
    
    

    await loginToMeTime(page)
    await navigateToRosters(page)
})()