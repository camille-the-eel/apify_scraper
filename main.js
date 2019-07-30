const Apify = require('apify');
const util = require('util');


Apify.main(async () => {

    //GET QUEUE
    const requestQueue = await Apify.openRequestQueue();
    //FIRST QUEUE REQUEST
    await requestQueue.addRequest(new Apify.Request
        ({  url: 'https://www.visithoustontexas.com/events/',
            userData: {
                label: 'START'
            }
        }));

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
            console.log("WAITING FOR LINK TO NEXT PAGE");
            try {
                await page.waitFor(nextPageBtn, {timeout}); //DEFAULT 30 SEC. TIMER FOR FIRST PAGE LOAD
                timeout = 2000; //2 SEC. TIMER FOR ITERATED PAGES
            } catch (err) {
                console.log("COULD NOT FIND LINK TO NEXT // THE END OF EVENTS");
                //ERROR TO BE EXPECTED, PAGINATION END
                break;
            }
            console.log("CLICKING TO NEXT PAGE");
            await page.click(nextPageBtn);
        }

        //ENQUEUING NEW LINKS TO REQUESTQUEUE
        const enqueued = await Apify.utils.enqueueLinks({
            page,
            requestQueue,
            pseudoUrls: ['https://www.visithoustontexas.com/event/[.*]'],
            transformRequestFunction: { userData: { label: 'DETAIL '} }
        });
        console.log(`ENQUERED ${enqueued.length} URLS.`)
    }
    
    //SINGULAR EVENT SCRAPING
    if (request.userData.label === 'DETAIL') {
        const { url } = request;
        const title = await page.title();
        console.log(`DETAIL ${url}, & ${title}`);
        // await page.waitFor(() => !!window.eventData, { timeout: 60000 }); 
    }

    // return {
    //     url, 
    //     title,
    //     description,
    //     date
    // }
}
