erfan4lx = (function(){
    
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var SCROLL_INTERVAL = 600, 
        SCROLL_INCREMENT = 450, 
        AUTO_SCROLL = true,
        NAME_PREFIX = '',
        UNKNOWN_CONTACTS_ONLY = false, 
        MEMBERS_QUEUE = {},
        TOTAL_MEMBERS;

    var scrollInterval, observer, membersList, header;

    var start = function(){

        membersList = document.querySelectorAll('span[title=You]')[0]?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode;
        header = document.getElementsByTagName('header')[0];

        if(!membersList){
            document.querySelector("#main > header").firstChild.click();
            membersList = document.querySelectorAll('span[title=You]')[0]?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode;
            header = document.getElementsByTagName('header')[0];
        }

        observer = new MutationObserver(function (mutations, observer) {   
            scrapeData(); // fired when a mutation occurs
        });
    
        // the div to watch for mutations
        observer.observe(membersList, {
            childList: true,
            subtree: true
        });

        TOTAL_MEMBERS = membersList.parentElement.parentElement.querySelector('span').innerText.match(/\d+/)[0]*1;
        
        // click the `n more` button to show all members
        document.querySelector("span[data-icon=down]")?.click()

        //scroll to top before beginning
        header.nextSibling.scrollTop = 100;
        scrapeData();

        if(AUTO_SCROLL) scrollInterval = setInterval(autoScroll, SCROLL_INTERVAL);    
    }

    
    /**
     *  Function to autoscroll the div
     */

    var autoScroll = function (){
        if(!utils.scrollEndReached(header.nextSibling)) 
            header.nextSibling.scrollTop += SCROLL_INCREMENT;
        else
            stop();
    };

    /**
     *  Stops the current scrape instance
     */

    var stop = function(){
        window.clearInterval(scrollInterval);
        observer.disconnect();
        console.log(`%c Extracted [${utils.queueLength()} / ${TOTAL_MEMBERS}] Members. Starting Download..`,`font-size:13px;color:white;background:green;border-radius:10px;`)
        downloadAsCSV(['Name','Phone','Status']);
    }

    /**
     *  Function to scrape member data
     */
    var scrapeData = function () {
        var contact, status, name;
        var memberCard = membersList.querySelectorAll(':scope > div');

        for (let i = 0; i < memberCard.length; i++) {

            status = memberCard[i].querySelectorAll('span[title]')[1] ? memberCard[i].querySelectorAll('span[title]')[1].title : "";
            contact = scrapePhoneNum(memberCard[i]);
            name = scrapeName(memberCard[i]);

            if (contact.phone!='NIL' && !MEMBERS_QUEUE[contact.phone]) {

                if (contact.isUnsaved) {
                    MEMBERS_QUEUE[contact.phone] = { 'Name': NAME_PREFIX + name,'Status': status };
                    continue;
                } else if (!UNKNOWN_CONTACTS_ONLY) {
                    MEMBERS_QUEUE[contact.phone] = { 'Name': name, 'Status': status };
                }

            }else if(MEMBERS_QUEUE[contact.phone]){
                MEMBERS_QUEUE[contact.phone].Status = status;
            }

            if(utils.queueLength() >= TOTAL_MEMBERS) {
                stop();
                break;
            }
                
            //console.log(`%c Extracted [${utils.queueLength()} / ${TOTAL_MEMBERS}] Members `,`font-size:13px;color:white;background:green;border-radius:10px;`)
        }
    }

    /**
     * Scrapes phone no from html node
     * @param {object} el - HTML node
     * @returns {string} - phone number without special chars
     */

    var scrapePhoneNum = function(el){
        var phone, isUnsaved = false;
        if (el.querySelector('img') && el.querySelector('img').src.match(/u=[0-9]*/)) {
           phone = el.querySelector('img').src.match(/u=[0-9]*/)[0].substring(2).replace(/[+\s]/g, '');
        } else {
           var temp = el.querySelector('span[title]').getAttribute('title').match(/(.?)*[0-9]{3}$/);
           if(temp){
               phone = temp[0].replace(/\D/g,'');
               isUnsaved = true;
           }else{
               phone = 'NIL';
           }
        }
        return { 'phone': phone, 'isUnsaved': isUnsaved };
    }
    
    /**
     *  Scrapes name from HTML node
     * @param {object} el - HTML node
     * @returns {string} - returns name..if no name is present phone number is returned
     */

    var scrapeName = function (el){
        var expectedName;
        expectedName = el.firstChild.firstChild.childNodes[1].childNodes[1].childNodes[1].querySelector('span').innerText;
        if(expectedName == ""){
            return el.querySelector('span[title]').getAttribute('title'); //phone number
        }
        return expectedName;
    }


    /**
     * A utility function to download the result as CSV file
     * @References
     * [1] - https://stackoverflow.com/questions/4617935/is-there-a-way-to-include-commas-in-csv-columns-without-breaking-the-formatting
     * 
     */
    var downloadAsCSV = function (header) {

        var groupName = document.querySelectorAll("#main > header span")[1].title;
        var fileName = groupName.replace(/[^\d\w\s]/g,'') ? groupName.replace(/[^\d\w\s]/g,'') : 'WAXP-group-members';

        var name = `${fileName}.csv`, data = `${header.join(',')}\n`;

        if(utils.queueLength() > 0){

            for (key in MEMBERS_QUEUE) {
                // Wrapping each variable around double quotes to prevent commas in the string from adding new cols in CSV
                // replacing any double quotes within the text to single quotes
                if(header.includes('Status'))
                    data += `"${MEMBERS_QUEUE[key]['Name']}","${key}","${MEMBERS_QUEUE[key]['Status'].replace(/\"/g,"'")}"\n`;
                else
                    data += `"${MEMBERS_QUEUE[key]['Name']}","${key}"\n`;
            }
            utils.createDownloadLink(data,name);
            
        }else{
            alert("Couldn't find any contacts with the given options");
        }

        
        
    }

    /**
     *  Scrape contacts instantly from the group header.
     *  Saved Contacts cannot be exchanged for numbers with this method.
     */

    var quickExport = function(){

        var members = document.querySelectorAll("#main > header span")[2].title.replace(/ /g,'').split(',');
        var groupName = document.querySelectorAll("#main > header span")[1].title;
        var fileName = groupName.replace(/[^\d\w\s]/g,'') ? groupName.replace(/[^\d\w\s]/g,'') : 'WAXP-group-members';
        
        fileName = `${fileName}.csv`;
        members.pop(); //removing 'YOU' from array

        MEMBERS_QUEUE = {};

        for (i = 0; i < members.length; ++i) {
            if (members[i].match(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)) {
                MEMBERS_QUEUE[members[i]] = {
                    'Name': NAME_PREFIX + members[i]
                };
                continue;
            } else if (!UNKNOWN_CONTACTS_ONLY) {
                MEMBERS_QUEUE[members[i]] = {
                    'Name': members[i]
                };
            }
        }
        
        downloadAsCSV(['Name','Phone']);

    }

    /**
     *  Helper functions
     *  @References [1] https://stackoverflow.com/questions/53158796/get-scroll-position-with-reactjs/53158893#53158893
     */

    var utils = (function(){

        return {
           scrollEndReached: function(el){
               if((el.scrollHeight - (el.clientHeight + el.scrollTop)) == 0)
                    return true;
                return false;
           },
           queueLength: function() {
               var size = 0, key;
               for (key in MEMBERS_QUEUE) {
                   if (MEMBERS_QUEUE.hasOwnProperty(key)) size++;
               }
               return size;
           },
           createDownloadLink: function (data,fileName) {
               var a = document.createElement('a');
               a.style.display = "none";

               var url = window.URL.createObjectURL(new Blob([data], {
                   type: "data:attachment/text"
               }));
               a.setAttribute("href", url);
               a.setAttribute("download", fileName);
               document.body.append(a);
               a.click();
               window.URL.revokeObjectURL(url);
               a.remove();
           }
        }
    })();

   
    // Defines the WAXP interface following module pattern
    return {
            start: function(){
                 MEMBERS_QUEUE = {}; //reset
                 try {
                     start();
                 } catch (error) {
                     //TO overcome below error..but not sure of any sideeffects
                     //TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'.
                     console.log(error, '\nRETRYING in 1 second')
                     setTimeout(start, 1000);
                 }
            },
            stop: function(){
                stop()
            },
            options: {
                // works for now...but consider refactoring it provided better approach exist
                set NAME_PREFIX(val){ NAME_PREFIX = val },
                set SCROLL_INTERVAL(val){ SCROLL_INTERVAL = val },
                set SCROLL_INCREMENT(val){ SCROLL_INCREMENT = val },
                set AUTO_SCROLL(val){ AUTO_SCROLL = val },
                set UNKNOWN_CONTACTS_ONLY(val){ UNKNOWN_CONTACTS_ONLY = val },
                // getter
                get NAME_PREFIX(){ return NAME_PREFIX },
                get SCROLL_INTERVAL(){ return SCROLL_INTERVAL },
                get SCROLL_INCREMENT(){ return SCROLL_INCREMENT },
                get AUTO_SCROLL(){ return AUTO_SCROLL },
                get UNKNOWN_CONTACTS_ONLY(){ return UNKNOWN_CONTACTS_ONLY },     
            },
            quickExport: function(){
                quickExport();
            },
            debug: function(){
                return {
                    size: utils.queueLength(),
                    q: MEMBERS_QUEUE
                }
            }
    }
})();

erfan4lx.quickExport()
