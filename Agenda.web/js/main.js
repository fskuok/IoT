(function(){

    'use strict';


    var
        //convert 1 digit number into 2 digits string
        _2d = function(a){ return a < 10 ? '0' + a : a + '';},


        //put space between camel case words
        _spaceCamelCase = function(a) {
            return a
                // insert a space before all caps
                .replace(/([A-Z])/g, ' $1')
                // uppercase the first character
                .replace(/^./, function (str) {
                    return str.toUpperCase();
                })
            },

    //agendaApp BEGIN
        agendaApp = angular.module('agendaApp', [])

            //using tabletop.js (https://github.com/jsoma/tabletop)
            //to fetch data form google spreadsheet
            .factory('tableTop', function(){
                function get(key, callback) {

                    var param = {
                        key: key,
                        simpleSheet: true,
                        callback: callback
                    };

                    Tabletop.init( param );
                }

                return {
                    get: get
                }
            })

            //service that connects spark cores
            .factory('spark', ['$http', 'tableTop', function($http, tableTop){
                var spark = {
                        deviceInfo : {},
                        getVar: getVar,
                        triggerFn: triggerFn
                    };

                //fetch and parse spark data
                (function getSparkData(){
                    tableTop.get(app_data.google_spreadsheet.spark_data_key, function(data){
                        var i, j, buffer;

                        //reorganize spark data
                        for(i in data){

                            if(data.hasOwnProperty(i)){

                                buffer = {};
                                j = 1;

                                buffer.key = data[i].key;

                                while(true){
                                    //mindful of the ++ and break
                                    if(data[i]['var'+j])
                                        buffer[data[i]['var'+j]] = {
                                            type : 'variable',
                                            description: data[i]['var'+ j++ + 'description'],
                                            value : undefined
                                        };
                                    else break;
                                }

                                j = 1;

                                while(true){
                                    //mindful of the ++ and break
                                    if(data[i]['fn'+j])
                                        buffer[data[i]['fn'+j]] = {
                                            type : 'function',
                                            description: data[i]['fn'+ j++ + 'description'],
                                            value : undefined
                                        };
                                    else break;
                                }

                                spark.deviceInfo[ data[i].name ] = buffer;
                            }


                        }

                        console.log('spark data fetched successfully', spark.deviceInfo);

                    });
                })();

                function getUrl(deviceKey, varName){
                    return  "https://api.spark.io/v1/devices/" + deviceKey + "/" +  varName + "?access_token=" + spark.deviceInfo.sparkCloud.key;
                }

                function getVar(deviceID, varName, onSuccess){
                    $http
                        .get( getUrl(deviceID, varName) )
                        .success( onSuccess );
                }

                function triggerFn(deviceID, funcName, args, onSuccess) {
                    $http
                        .post( getUrl(deviceID, funcName), {"args": args} )
                        .success( onSuccess );
                }

                return spark;
            }])

            .factory('dom', function(){
                var dom,
                    panel =  document.querySelector('.panel');

                panel.on = function(){
                    this.style.display = 'block';
                    this.status = "on";
                    return this;
                };

                panel.off = function(){
                    this.style.display = 'none';
                    this.status = "off";
                    return this;
                };

                panel.toggle = function(){
                    if(this.status === "on"){
                        this.off();
                    }else{
                        this.on();
                    }
                };

                function getEventsTop(){
                    if(!this.initTop)
                    this.initTop = parseInt(
                            getComputedStyle(
                                document.querySelector( 'div.event:first-of-type' )
                            ).top);
                }

                function scrollTo(n) {
                    n = n || 0;
                    $('div.event').css('top', ( dom.events.initTop || 0 ) - 130*n);
                }

                function nextEvent(n) {
                    n = n || 1;
                    $('div.event').css('top', '-=' + 130*n);
                }

                function prevEvent(n) {
                    n = n || 1;
                    $('div.event').css('top', '+=' + 130*n);
                }

                dom = {
                    events:{
                        scrollTo: scrollTo,
                        nextEvent: nextEvent,
                        prevEvent: prevEvent,
                        getEventsTop: getEventsTop,
                        initTop: undefined

                    },
                    panel: panel
                };

                return dom;
            })


            //service that returns time and dates, calculate time
            .factory('time', function(){

                //get a Date object
                //with Today's date, and passed in arguments as time
                //@param: Number {2, 3} | Array [Number{2,3}]
                //@return Date object
                function getDate(h, m, s){
                    var d = new Date();

                    //handle input [h, m, s] or [h, m]
                    if(typeof h === 'object' && h.slice){
                        m = h[1];
                        s = h[2];
                        h = h[0];
                    }

                    d.setHours( h || 0 );
                    d.setMinutes( m || 0 );
                    d.setSeconds( s || 0 );

                    return d;
                }

                //return the formatted current date
                //@return String eg. 'Sun | Nov 16'
                function date(){
                    var arr = new Date().toString().split(' ');
                    return arr[0] + ' | ' + arr[1] + ' ' + arr[2];
                }

                //Calculate the duration between start and end
                //@param: String: 'xx:xx' | Date object, String: 'xx:xx' | Date object
                //@return: Strings
                function duration(start, end){

                    var sarr = typeof start === 'string' ?
                            start.split(':') : [start.getHours(), start.getMinutes()],
                        earr = typeof start === 'string' ?
                            end.split(':') : [end.getHours(), end.getMinutes()],
                        minsTotal = (+earr[0] - ( +sarr[0]) )*60 + ( +earr[1] - (+sarr[1]) );

                    return [Math.floor( minsTotal/60 ), ( minsTotal%60 )]
                }

                function percentage(gone, total){
                    var totalMins = total[0]*60 + total[1],
                        goneMins = gone[0]*60 + gone[1];
                    return goneMins / totalMins * 100;
                }

                return {
                    duration: duration,
                    getDate: getDate,
                    percentage: percentage,
                    date: date
                }
            })

            //used for panel, filter properties that are not shown
            .filter('ignoreKey', function(){
                var a = ',';

                return function(input, ignoredKey){
                    var newObj = {};
                    for(var key in input){
                        if( input.hasOwnProperty(key) && !(key+a).match(ignoredKey) ){
                            newObj[key] = input[key];
                        }
                    }
                    return newObj;
                }
            })

            .controller('agendaCtrl',

                ['$scope', 'tableTop', 'dom', 'time', 'spark',
                    function( $scope, tableTop, dom, time, spark){

                        $scope.panelMessage = 'Loading...';

                        //data of the whole meeting
                        //initiated in init()
                        $scope.meeting = {
                            status: 'before',
                            startDate: undefined,
                            endDate: undefined
                        };

                        //data of the ongoing event
                        //initiated and updated by $scope.isOn()
                        $scope.nowEvent = {
                            id: undefined,
                            startDate: undefined,
                            endDate: undefined
                        };

                        //data of now time
                        //values updated by refreshTime()
                        $scope.progressPercentage = 0;

                        //data of now time
                        //values initiated and updated by refreshTime()
                        $scope.time = {
                            dateObj: new Date(),
                            hour: undefined,
                            min: undefined,
                            sec: undefined
                        };


                        $scope.deviceIgnoreList = app_data.panel.ignored_devices;
                        $scope.deviceVarIgnoreList = app_data.panel.ignored_vars;
                        $scope.devices = spark.deviceInfo;

                        // functions for html template to use
                        $scope.duration = time.duration;
                        $scope.date = time.date;
                        $scope.spaceCamelCase = _spaceCamelCase;
                        $scope.isOn = isOn;
                        //put in an anonymous function to prevent angular dom error
                        $scope.togglePanel = function(){ dom.panel.toggle(); };



                        function init(){

                            //refresh time and set refreshing every second
                            refreshTime();
                            setInterval(function(){
                                $scope.$apply(refreshTime);
                            }, 1000);

                            //fetch agenda data
                            tableTop.get( app_data.google_spreadsheet.agenda_data_key, function(data) {

                                $scope.$apply( function() {

                                    $scope.meeting.startDate = time.getDate( data[0].start.split(':') );
                                    $scope.meeting.endDate = time.getDate( data[data.length-1].end.split(':') );

                                    //assign agenda data to Angular scope
                                    $scope.events = data;

                                    //adjust panel according to meeting is not started, ongoing or ended
                                    switch ( $scope.isOn(  $scope.meeting.startDate, $scope.meeting.endDate )){

                                        case 'now' :
                                            $scope.meeting.status = 'now';

                                            //has a delay for dom to ready
                                            setTimeout(function(){
                                                dom.panel.off();
                                            },500);

                                            $scope.panelMessage = app_data.panel.meeting_messages[1];
                                            break;

                                        case 'before':
                                            $scope.meeting.status = 'ended';
                                            dom.panel.on();
                                            $scope.panelMessage = app_data.panel.meeting_messages[2];
                                            break;

                                        case 'after':
                                            $scope.meeting.status = 'uninitiated';
                                            dom.panel.on();
                                            $scope.panelMessage = app_data.panel.meeting_messages[0];

                                    }

                                });

                                dom.events.getEventsTop();

                                console.log('Agenda data fetched successfully: ', $scope.events);

                            });


                        }

                        //Refresh time for the clock
                        function refreshTime(){
                            $scope.time.dateObj = new Date();

                            //refresh the clock
                            $scope.time.hour =
                                    _2d($scope.time.dateObj.getHours());

                            $scope.time.min =
                                    _2d($scope.time.dateObj.getMinutes());

                            $scope.time.sec =
                                    _2d($scope.time.dateObj.getSeconds());



                            if($scope.meeting.status === 'now'){

                                //refresh meeting progress bar's percentage
                                $scope.progressPercentage = time.percentage(
                                    time.duration( $scope.meeting.startDate, $scope.time.dateObj ),
                                    time.duration( $scope.meeting.startDate, $scope.meeting.endDate )
                                );

                                //refresh the remaining time of current event
                                $scope.remainingHours = _2d(time.duration($scope.time.dateObj, $scope.nowEvent.endDate)[0]);
                                $scope.remainingMins = _2d(time.duration($scope.time.dateObj, $scope.nowEvent.endDate)[1]);
                            }



                            if($scope.meeting.status === 'uninitiated')
                                //refresh panel message with how long later will the meeting begin
                                $scope.panelMessage = app_data.panel.meeting_messages[0] + ' after ' +
                                                    time.duration( $scope.time.dateObj, $scope.meeting.startDate ).join( ':' );

                        }

                        //check if now time is between a time period
                        //@return: Boolean
                        function isOn(start, end, eventId){
                            start = start instanceof Date ? start : time.getDate( start.split(':') );
                            end = end instanceof Date ? end : time.getDate( end.split(':') );

                            if( start <= $scope.time.dateObj && $scope.time.dateObj < end ){

                                //if this function is used to check a single event
                                if(eventId !== undefined){

                                    //do not scroll before initTop is set
                                    if(dom.events.initTop) dom.events.scrollTo( eventId );


                                    $scope.nowEvent.id = eventId;
                                    $scope.nowEvent.startDate = start;
                                    $scope.nowEvent.endDate = end;
                                }

                                return 'now';

                            }else if( $scope.time.dateObj >= end ){

                                return 'before';

                            }else{

                                return 'after';

                            }
                        }


                        init();
                }]
            );

    //agendaApp END
    //var END

})();






