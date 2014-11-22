

(function(){

'use strict';


agendaApp
    .controller('agendaCtrl',

    ['$scope', '$interval', 'tableTop', 'dom', 'time', 'spark',
        function( $scope, $interval, tableTop, dom, time, spark){
            var refreshPromise, refreshInterval = 1000;

            $scope.panelMessage = 'Loading...';
            $scope.listeners = {};


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
                endDate: undefined,
                remaining:{
                    h: undefined,
                    m: undefined,
                    s: undefined
                }
            };

            //data of now time
            //values updated by refreshTime()
            $scope.progressPercentage = 0;

            //data of now time
            //values initiated and updated by refreshTime()
            $scope.now = {
                dateObj: new Date(),
                h: undefined,
                m: undefined,
                s: undefined
            };


            $scope.deviceIgnoreList = app_data.panel.ignored_devices;
            $scope.deviceVarIgnoreList = app_data.panel.ignored_vars;
            $scope.devices = spark.deviceInfo;

            // functions for html template to use
            $scope.duration = time.duration;
            $scope.date = time.date;
            $scope.isOn = isOn;
            $scope.parseStatus = spark.parseStatus;

            // put in an anonymous function to prevent angular dom error
            $scope.togglePanel = function(){ dom.panel.toggle(); };
            //
            $scope.triggerFn = function(deviceName, fnName, args){
                spark.deviceInfo[ deviceName ][ fnName ].call( args )
            };


            function init(){

                //refresh time and set refreshing every second
                refresh();
                refreshPromise = $interval(refresh, refreshInterval);

                //fetch agenda data
                tableTop.get( app_data.google_spreadsheet.agenda_data_key, initAgenda);

            }

            function initAgenda(data){


                $scope.$apply( function() {

                    $scope.meeting.startDate = time.getDate( data[0].start.split(':') );
                    $scope.meeting.endDate = time.getDate( data[data.length-1].end.split(':') );

                    //assign agenda data to Angular scope
                    $scope.events = data;

                    //adjust panel according to meeting is not started, ongoing or ended
                    (function adjustPanel(){
                        switch ( $scope.isOn(  $scope.meeting.startDate, $scope.meeting.endDate )){

                            case 'now' :

                                $scope.meeting.status = 'now';

                                //has a delay for dom to ready
                                setTimeout(function(){ dom.panel.off(); }, 500);

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
                    })();


                });

                function registerAgendaEvents(){

                    var i,
                        timeStack = $scope.listeners.time = {},

                        //{ key : { value : { time and shift : [handlers] } } }
                        rules = app_data.rules;



                    for(i = 0; i < data.length; i++){
                        registerEvent.call(data[i], i);
                    }

                    function registerEvent(index){
                        var thisEvent = {
                            start : time.getDate( this.start.split(':') ),
                            end : time.getDate( this.end.split(':') )
                        };
                        thisEvent.startStamp = thisEvent.start.getTime();
                        thisEvent.endStamp = thisEvent.end.getTime();

                        //find if there is matched rules
                        if(rules.index[+ this.no - 1]){
                            register(rules.index[+ this.no - 1]);
                        }
                        if(rules.type[this.type]){
                            register(rules.type[this.type]);
                        }

                        //register handlers in matched rules to the $scope.listeners.time object
                        function register(matchedRules){

                            var shift, shiftArr, timestamp;

                            //for every time shift in the matched handler stack
                            for(shift in matchedRules){

                                if(matchedRules.hasOwnProperty(shift)){
                                    shiftArr = shift.split(':');

                                    // get the timestamp after shifted time
                                    timestamp = time.getShiftedDate(thisEvent[shiftArr[0]], + shiftArr[1], + shiftArr[2], + shiftArr[3])
                                        .getTime();

                                    // if already handlers at certain timestamp, concat to the end of the array
                                    // else, create one
                                    timeStack[timestamp] = timeStack[timestamp]
                                        ? timeStack[timestamp].concat( matchedRules[shift].split('|') )
                                        : matchedRules[shift].split('|') ;

                                }
                            }
                        }
                    }
                }


                registerAgendaEvents();


                dom.events.getEventsTop();

                console.log('Agenda data fetched successfully: ', $scope.events);
            }

            function refresh(){
                refreshTime();
                refreshSpark();
                if($scope.listeners.time) watcher();

            }



            function watcher(){

                var i, stack = $scope.listeners.time[ $scope.now.date.getTime() ];

                //if there are handler stack matches now time
                if( stack ){
                    for(i in stack){
                        if( stack.hasOwnProperty(i) ){
                            spark.handlers[stack[i]]();
                        }
                    }
                }
            }

            //Refresh spark status
            function refreshSpark(){

                //make sure spark info is fetched
                if(spark.deviceInfo["Spark Cloud"]){

                    spark.updateVars();
                }
            }


            //Refresh time for the clock
            function refreshTime(){


                //get the now time and set milliseconds to 0
                var now = new Date();
                now.setMilliseconds(0);

                //refresh the clock model
                $scope.now = time.getHMS(now);

                if($scope.meeting.status === 'now'){

                    //refresh meeting progress bar's percentage
                    $scope.meeting.progressPercentage = time.percentage(
                        time.duration( $scope.meeting.startDate, now ),
                        time.duration( $scope.meeting.startDate, $scope.meeting.endDate )
                    );

                    //refresh the remaining time of current event
                    $scope.nowEvent.remaining.h = time.duration( now, $scope.nowEvent.endDate)[0];
                    $scope.nowEvent.remaining.m = time.duration( now, $scope.nowEvent.endDate)[1];
                    $scope.nowEvent.remaining.s = time.duration( now, $scope.nowEvent.endDate)[2];
                }



                if($scope.meeting.status === 'uninitiated')
                //refresh panel message with how long later will the meeting begin
                    $scope.panelMessage = app_data.panel.meeting_messages[0] + ' after ' +
                        time.duration( $scope.now.date, $scope.meeting.startDate ).join( ':' );


                $scope.now.date = now;
            }



            //check if now time is between a time period
            //@return: Boolean
            function isOn(start, end, eventId){
                start = start instanceof Date ? start : time.getDate( start.split(':') );
                end = end instanceof Date ? end : time.getDate( end.split(':') );

                if( start <= $scope.now.date && $scope.now.date < end ){

                    //if this function is used to check a single event
                    if(eventId !== undefined){

                        //do not scroll before initTop is set
                        if(dom.events.initTop) dom.events.scrollTo( eventId );

                        $scope.nowEvent.id = eventId;
                        $scope.nowEvent.startDate = start;
                        $scope.nowEvent.endDate = end;
                    }

                    return 'now';

                }else if( $scope.now.date >= end ){

                    return 'before';

                }else{

                    return 'after';

                }
            }


            init();
        }]
);
})();