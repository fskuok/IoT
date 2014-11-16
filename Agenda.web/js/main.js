// link of the data sheet
var AGENDA_GOOGLE_SPREADSHEET_KEY = "1rGsUNIk_zhfuNUMglR-4My7vPqku-sZg8JBYkKp9Qf4",
    SPARK_SPREADSHEET_KEY =         "11fi7mpyJZNgMvyP9qtCYFzPUNSQV4CDGsyXFqZnOl10",
	DEVICES = {
			"DOOR": "53ff6e066667574826422167"
		};


(function(){

    'use strict';

	var agendaApp = angular.module('agendaApp', [])

        //using tabletop.js https://github.com/jsoma/tabletop
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

        //services that connect spark boards
        .factory('spark', ['$http', function($http){
            function RETURN_URL(DEVICE_KEY, VARIABLE_NAME){

                return  "https://api.spark.io/v1/devices/" + DEVICE_KEY + "/" +  VARIABLE_NAME + "?access_token=6564c0732ab5d528aee3a4b84b9f35b77604d026";

            }

            function getVar(deviceID, varName, onSuccess){
                $http
                    .get( RETURN_URL(deviceID, varName) )
                    .success( onSuccess );
            }

            function triggerFn(deviceID, funcName, args, onSuccess) {
                $http
                    .post( RETURN_URL(deviceID, funcName), {"args": args} )
                    .success( onSuccess );
            }

            return {
                getVar: getVar,
                triggerFn: triggerFn
            }
        }])

        .factory('dom', function(){
            var panel =  document.querySelector('.panel');

            panel.on = function(){
                this.style.display = 'block';
                return this;
            };

            panel.off = function(){
                this.style.display = 'none';
            };

            function scrollTo(n) {
                n = n || 1;
                $('div.event').css('top', 200 - 130*n);
            }

            function nextEvent(n) {
                n = n || 1;
                $('div.event').css('top', '-=' + 130*n);
            }

            function prevEvent(n) {
                n = n || 1;
                $('div.event').css('top', '+=' + 130*n);
            }

            return {
                events:{
                    scrollTo: scrollTo,
                    nextEvent: nextEvent,
                    prevEvent: prevEvent
                },
                panel: panel
            }
        })

        .factory('time', function(){

            //Calculate the interval of start and end
            //@param: String: 'xx:xx' | Date object, String: 'xx:xx' | Date object
            //@return: Strings

            function duration(start, end){

                var sarr = typeof start === 'string' ?
                        start.split(':') : [start.getHours(), start.getMinutes()],
                    earr = typeof start === 'string' ?
                        end.split(':') : [end.getHours(), end.getMinutes()],
                    minsTotal = (earr[0] - sarr[0])*60 + (earr[1] - sarr[1]);

                return [Math.floor( minsTotal/60 ), ( minsTotal%60 )]
            }

            return {
                duration: duration
            }
        })


        .controller('agendaCtrl',

            ['$scope', '$http', 'tableTop', 'dom', 'time',
                function( $scope, $http, tableTop, dom, time){
                    $scope.panelMessage = 'Loading...';
                    $scope.nowEvent = {};

                    //fetch agenda data
                    tableTop.get( AGENDA_GOOGLE_SPREADSHEET_KEY, function(data) {
                        $scope.$apply( function() {
                            $scope.events = data;
                            if( $scope.isOn( data[0].start, data[ data.length - 1 ].end ) === 'now'){
                                dom.panel.off();
                            }else{
                                $scope.panelMessage = 'Meeting ended';
                            }

                        });
                    });





                    //set date data
                    $scope.date = function(){
                        var arr = new Date().toString().split(' ');
                        return arr[0] + ' | ' + arr[1] + ' ' + arr[2];
                    };

                    //
                    $scope.duration = time.duration;

                    $scope.time = {};

                    //Refresh the time for the clock
                    function refreshTime(){
                        var nowTime = new Date(),
                            remainingTime;

                        $scope.time.hour =
                                nowTime.getHours() < 10 ? '0' + nowTime.getHours(): nowTime.getHours();

                        $scope.time.min =
                                nowTime.getMinutes() < 10 ? '0' + nowTime.getMinutes(): nowTime.getMinutes();

                        $scope.time.sec =
                                nowTime.getSeconds() < 10 ? '0' + nowTime.getSeconds(): nowTime.getSeconds();

                        if($scope.nowEvent.endDate){
                            remainingTime = time.duration(nowTime, $scope.nowEvent.endDate);
                            $scope.remainingHours = remainingTime[0];
                            $scope.remainingMins = remainingTime[1];
                        }

                    }
                    refreshTime();

                    //check if now time is between a time period
                    //@return: Boolean
                    $scope.isOn = function(start, end, eventId){

                        var s = new Date(), e = new Date(), n = new Date();

                        start = start.split(':');
                        end = end.split(':');

                        s.setHours( start[0] );
                        s.setMinutes( start[1] );
                        s.setSeconds(0);
                        e.setHours( end[0] );
                        e.setMinutes( end[1] );
                        e.setSeconds(0);

                        if( s <= n && n < e ){
                            if(eventId){
                                dom.events.scrollTo( eventId );

                                $scope.nowEvent.id = eventId;
                                $scope.nowEvent.startDate = s;
                                $scope.nowEvent.endDate = e;

                            }
                            return 'now';

                        }else if( n >= e ){

                            return 'before';
                        }else{

                            return 'after';
                        }
                    };





                    //refreshed by seconds
                    setInterval(function(){
                        $scope.$apply(refreshTime);
                    }, 1000);




            }]
        );

    //agendaApp ends



})();





