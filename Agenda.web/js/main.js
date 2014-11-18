(function(){

    'use strict';

	var AGENDA_GOOGLE_SPREADSHEET_KEY = "1rGsUNIk_zhfuNUMglR-4My7vPqku-sZg8JBYkKp9Qf4",
        SPARK_SPREADSHEET_KEY =         "11fi7mpyJZNgMvyP9qtCYFzPUNSQV4CDGsyXFqZnOl10";

    var agendaApp = angular.module('agendaApp', [])

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
                    triggerFn: triggerFn,
                    getSparkData: getSparkData
                };

            //fetch and parse spark information
            function getSparkData(){
                tableTop.get(SPARK_SPREADSHEET_KEY, function(data){
                    var i, j, buffer;

                    //reorganize spark information
                    for(i in data){

                        if(data.hasOwnProperty(i)){

                            buffer = {};
                            j = 1;

                            buffer.key = data[i].key;

                            while(true){
                                if(data[i]['var'+j])
                                    buffer[data[i]['var'+j++]] = {
                                        type : 'variable',
                                        description: data[i]['var'+ j + 'description'],
                                        value : undefined
                                    };
                                else break;
                            }

                            j = 1;

                            while(true){
                                if(data[i]['fn'+j])
                                    buffer[data[i]['fn'+j++]] = {
                                        type : 'function',
                                        description: data[i]['fn'+ j + 'description'],
                                        value : undefined
                                    };
                                else break;
                            }

                            spark.deviceInfo[data[i].name] = buffer;
                        }
                    }

                    console.log('spark data fetched successfully', spark.deviceInfo);

                });
            }

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
                return this;
            };

            panel.off = function(){
                this.style.display = 'none';
                return this;
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
                    minsTotal = (+earr[0] - (+sarr[0]) )*60 + (+earr[1] - (+sarr[1]));

                return [Math.floor( minsTotal/60 ), ( minsTotal%60 )]
            }

            function percentage(gone, total){
                var totalMins = total[0]*60+total[1],
                    goneMins = gone[0]*60+gone[1];
                return goneMins / totalMins * 100;
            }

            return {
                duration: duration,
                getDate: getDate,
                percentage: percentage,
                date: date
            }
        })


        .controller('agendaCtrl',

            ['$scope', '$http', 'tableTop', 'dom', 'time', 'spark',
                function( $scope, $http, tableTop, dom, time, spark){

                    $scope.panelMessage = 'Loading...';
                    $scope.meeting = {
                        status: 'before',
                        startDate: undefined,
                        endDate: undefined
                    };
                    $scope.nowEvent = {
                        id: undefined,
                        startDate: undefined,
                        endDate: undefined
                    };
                    $scope.time = {};


                    // functions for html template to use
                    $scope.duration = time.duration;
                    $scope.isOn = isOn;
                    $scope.date = time.date;

                    var panelMessages = ['Meeting going to begin', 'Meeting ongoing', 'Meeting ended'];



                    init();

                    function init(){


                        //refresh time and set refreshing every second
                        refreshTime();
                        setInterval(function(){
                            $scope.$apply(refreshTime);
                        }, 1000);

                        spark.getSparkData();

                        //fetch agenda data
                        tableTop.get( AGENDA_GOOGLE_SPREADSHEET_KEY, function(data) {

                            $scope.$apply( function() {
                                refreshTime();

                                var meetingStart = time.getDate( data[0].start.split(':') ),
                                    meetingEnd = time.getDate( data[data.length-1].end.split(':') );

                                //assign agenda data to Angular scope
                                $scope.events = data;
                                $scope.meeting.startDate = meetingStart;
                                $scope.meeting.endDate = meetingEnd;


                                //adjust panel according to meeting is not started, ongoing or ended
                                switch ( $scope.isOn( meetingStart, meetingEnd )){

                                    case 'now' :
                                        $scope.meeting.status = 'now';
                                        //has a delay for dom to ready
                                        setTimeout(function(){
                                            dom.panel.off();
                                        },500);
                                        $scope.panelMessage = panelMessages[1];
                                        break;

                                    case 'before':
                                        $scope.meeting.status = 'ended';
                                        dom.panel.on();
                                        $scope.panelMessage = panelMessages[2];
                                        break;

                                    case 'after':
                                        $scope.meeting.status = 'uninitiated';
                                        dom.panel.on();
                                        $scope.panelMessage = panelMessages[0];

                                }

                            });

                            dom.events.getEventsTop();

                            console.log('Agenda data fetched successfully: ', $scope.events);

                        });


                    }

                    function _2d(a){ return a < 10 ? '0' + a : a + ''; }

                    //Refresh the time for the clock
                    function refreshTime(){
                        var nowTime = new Date(),
                            remainingTime;

                        //refresh the clock
                        $scope.time.hour =
                                _2d(nowTime.getHours());

                        $scope.time.min =
                                _2d(nowTime.getMinutes());

                        $scope.time.sec =
                                _2d(nowTime.getSeconds());

                        if($scope.meeting.status === 'now')
                            $scope.progressPercentage = time.percentage(
                                time.duration($scope.meeting.startDate, nowTime),
                                time.duration($scope.meeting.startDate, $scope.meeting.endDate)
                            );

                        if($scope.meeting.status === 'uninitiated')
                            $scope.panelMessage = panelMessages[0] +
                                                    ' after ' +
                                                time.duration(nowTime, $scope.meeting.startDate).join(':');

                        //refresh the remaining time of current event
                        if($scope.nowEvent.endDate){

                            remainingTime = time.duration(nowTime, $scope.nowEvent.endDate);
                            $scope.remainingHours = _2d(remainingTime[0]);
                            $scope.remainingMins = _2d(remainingTime[1]);
                        }

                    }


                    //check if now time is between a time period
                    //@return: Boolean
                    function isOn(start, end, eventId){
                        var now = new Date();
                        start = start instanceof Date ? start : time.getDate(start.split(':'));
                        end = end instanceof Date ? end : time.getDate(end.split(':'));

                        if(eventId === undefined) console.log(now, start, end);

                        if( start <= now && now < end ){
                            //when this function is used to check a single event
                            if(eventId !== undefined){

                                //do not scroll before initTop is set
                                if(dom.events.initTop) dom.events.scrollTo( eventId );


                                $scope.nowEvent.id = eventId;
                                $scope.nowEvent.startDate = start;
                                $scope.nowEvent.endDate = end;
                            }

                            return 'now';

                        }else if( now >= end ){

                            return 'before';
                        }else{

                            return 'after';
                        }
                    }






            }]
        );

    //agendaApp ends



})();





