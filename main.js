const Apify = require('apify');


Apify.main(async () => {

    //GET QUEUE
    const requestQueue = await Apify.openRequestQueue();
    //FIRST QUEUE REQUEST
    await requestQueue.addRequest(new Apify.Request
        ({  url: 'https://www.visithoustontexas.com/events/?page=172',
            userData: {
                label: 'START'
            }
        }));

    //testing for detail scrape
    // await requestQueue.addRequest(new Apify.Request({ url: 'https://www.visithoustontexas.com/event/zumba-in-the-plaza/59011/' }));


    //EXECUTED FOR EACH REQUEST -- 3 RETRIES
    const pageFunction = async (context) => {

        const { request, page } = context;

        //EVENTS PAGINATING AND QUEUEING
        if (request.userData.label === 'START') {

            console.log("HOME: EVENTS PAGE");

            //UNDEFINED TIMEOUT
            let timeout;

            //UNIQUE SELECTOR TO PAGINATE HOUSTON EVENTS
            const nextPageBtn = 'a.next';

            //RUNS UNTIL waitFor THROWS ERROR (I.E. ONCE YOU'VE REACHED THE LAST PAGE)
            while (true) {
                try {
                    console.log("WAITING FOR LINK TO NEXT PAGE");
                    await page.waitFor(nextPageBtn, {timeout}); //DEFAULT 30 SEC. TIMER FOR FIRST PAGE LOAD
                    //ENQUEUING NEW LINKS TO REQUESTQUEUE
                    const enqueued = await Apify.utils.enqueueLinks({
                        page,
                        requestQueue,
                        pseudoUrls: ['https://www.visithoustontexas.com/event/[.*]']
                    });
                    console.log(`ENQUERED ${enqueued.length} URLS.`)
                    // timeout = 2000; //2 SEC. TIMER FOR ITERATED PAGES
                } catch (err) {
                    console.log("COULD NOT FIND LINK TO NEXT // THE END OF EVENTS");
                    //ERROR TO BE EXPECTED, PAGINATION END
                    break;
                }
                console.log("CLICKING TO NEXT PAGE");
                await page.click(nextPageBtn);
            }
        }

        //SINGULAR EVENT(PAGE) SCRAPING
        else {
            const { url } = request;
            const title = await page.title();
            const description = await page.$eval("div.description p", (el => el.textContent));
            const date = await page.$$eval("div.dates", (els) => els[0].textContent);

            //ERROR page specific -- index of array will change according to what information is available
                const checkRec = await page.$$eval("div.dates", (els) => els[1].textContent);
                    let recurring;
                    if (/\bRecurring\b/.test(checkRec)) {
                        recurring = checkRec;
                    }
                
                const contact = await page.$$eval("div.detail-c2 div", (els) => els[4].textContent);
                const phone = await page.$$eval("div.detail-c2 div", (els) => els[5].textContent);
                const time = await page.$$eval("div.detail-c2 div", (els) => els[6].textContent);
                const admission = await page.$$eval("div.detail-c2 div", (els) => els[7].textContent);

            //ERROR testing reading JSON-LD data from page -- incorrect method for reading page script -- contains address, title, starting/ending dates, url, location, partial description
            // var jsonLD = page.$$('script[type="application/ld+json"]');

            //NOTE script variable eventData contains all information as object but is inaccessible from the window?

            console.log(`DETAIL ${url}, & ${title}`);

            return {
                url, 
                title,
                description,
                date,
                time,
                recurring,
                details: {
                    contact,
                    phone,
                    admission
                }
            }
           
        }
    }


    //CREATE CRAWLER
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,

        //EXECUTED FOR EACH REQUEST -- 3 RETRIES
        handlePageFunction: pageFunction,

        //ERROR HANDLER AFTER 4 FAILURES
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed 4 times`);
        },
    });

    //RUN CRAWLER
    await crawler.run();
    
});