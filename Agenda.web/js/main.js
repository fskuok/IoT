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


            //used for panel, filter properties that are not shown
            .filter('ignoreKey', function(){
                var a = ',';

                return function(input, ignoredKey){
                    var newObj = {};
                    for(var key in input){
                        if( input.hasOwnProperty(key) && !(ignoredKey).match(key+a) ){
                            newObj[key] = input[key];
                        }
                    }
                    return newObj;
                }
            })

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
                        triggerFn: callFn,
                        updateVars: updateVars,
                        parseStatus: parseStatus //,
                        //toggleVarUpdate: toggleVarUpdate,
                        //turnOnVarUpdate: turnOnVarUpdate,
                        //turnOffVarUpdate: turnOffVarUpdate
                    };

                function _getUrl(deviceKey, varName){

                    if( !deviceKey || !varName ){
                        //throw new Error('Get Spark Url Error: [deviceKey]: ', deviceKey, '[varName]: ', varName);
                    }

                    return  "https://api.spark.io/v1/devices/" + deviceKey + "/" +  varName + "?access_token=" + spark.deviceInfo["Spark Cloud"].key;

                }

                function _varGetter(deviceName, varName){
                    return   varName ?
                        function(onSuccess){
                            getVar(deviceName, varName, onSuccess);
                        } :
                        function(varName, onSuccess){
                            getVar(deviceName, varName, onSuccess);
                        }
                }

                function _fnCaller(deviceName, fnName){
                    return fnName ?
                        function(args, onSuccess){
                            callFn(deviceName, fnName, args, onSuccess);
                        } :
                        function(fnName, args, onSuccess){
                            callFn(deviceName, fnName, args, onSuccess);
                        }
                }



                function getVar(deviceName, varName, onSuccess){


                    //if key not specified, return
                    if( !spark.deviceInfo[ deviceName ].key ) return undefined;

                    $http
                        .get( _getUrl( spark.deviceInfo[ deviceName ].key, varName ) )
                        .success( function(data){
                            spark.deviceInfo[ deviceName ][ varName ].value = data.result || 0;
                            spark.deviceInfo[ deviceName ][ varName ].updateTimestamp = (new Date()).getTime();
                            if(onSuccess) onSuccess(data);
                        })
                        .error(function(err){

                            if(err == "Not Found"){

                            }

                            //typeof null is also "object"
                            if(err && typeof err === "object"){
                                switch (err.error) {
                                    case "Variable not found":
                                    case "Timed out.":
                                    default :
                                }

                            }

                        });

                }

                function callFn(deviceName, fnName, args, onSuccess) {
                    $http
                        .post( _getUrl(spark.deviceInfo[ deviceName ].key, fnName), {"args": args} )
                        .success( function(data){
                            console.log(data);
                            if(onSuccess) onSuccess(data);
                        } );
                }

                //update var
                function updateVars(){
                    var deviceName, varName, device;

                    //loop every devices
                    for( deviceName in spark.deviceInfo ){

                        if( spark.deviceInfo.hasOwnProperty( deviceName )
                            && deviceName !== "Spark Cloud" ){

                            device = spark.deviceInfo[ deviceName ];


                            // get variables
                            // if the device has a key (d
                            // and the connection is allowed (device.status.autoUpdate = true)

                            if( device.key && device.status.autoUpdate === true ){

                                //loop every var
                                for( varName in device ){

                                    if( device.hasOwnProperty( varName )
                                        && device[ varName ].type === 'variable'
                                        && device[ varName ].autoUpdate === true ){

                                        device[varName].get();

                                    }
                                }
                            }else if( device.status.autoUpdate === false ){
                                device.status.value = 0;
                            }
                        }
                    }
                }

                /*************************************************************************
                 *
                 *
                 *
                 *

                function toggleVarUpdate(deviceName, varName, value){
                    if( spark.deviceInfo[ deviceName ]
                        && spark.deviceInfo[ deviceName ][ varName ]
                        && spark.deviceInfo[ deviceName ][ varName ].type === "variable"){

                        if (value === 'on') spark.deviceInfo[deviceName][varName].autoUpdate = true;
                        if (value === 'off') spark.deviceInfo[deviceName][varName].autoUpdate = false;
                        if (!value) spark.deviceInfo[deviceName][varName].autoUpdate = !spark.deviceInfo[deviceName][varName].autoUpdate;
                    }
                }

                function turnOnVarUpdate(deviceName, varName){
                    toggleVarUpdate(deviceName, varName, 'on');
                }

                function turnOffVarUpdate(deviceName, varName){
                    toggleVarUpdate(deviceName, varName, 'off');
                }

                **************************************************************************/


                function parseStatus(status){
                    if(status == 1){
                        return 'on'
                    }else{
                        return 'off'
                    }
                }

                function parseSparkData(data){
                    var i, j, device;

                    //reorganize spark data, device by device
                    for(i in data){

                        if( data.hasOwnProperty(i) ){

                            device = {};

                            j = 1;

                            device.key = data[i].key;
                            device.getVar = _varGetter( device.key );
                            device.callFn = _fnCaller( device.key );

                            while(true){
                                //mindful of the ++ and break
                                if( data[ i ][ 'var'+j] )
                                    device[ data[ i ][ 'var'+j ] ] = {
                                        type : 'variable',
                                        description: data[ i ][ 'var'+ j + 'description' ],
                                        value : undefined,
                                        autoUpdate: false,
                                        callbackCheck: undefined,
                                        updateTimestamp: undefined,
                                        get: _varGetter( data[ i ].name, data[ i ][ 'var'+j++ ])
                                    };
                                else break;
                            }

                            j = 1;

                            while(true){
                                //mindful of the ++ and break
                                if(data[ i ]['fn'+j])
                                    device[ data[ i ][ 'fn'+j ] ] = {
                                        type : 'function',
                                        description: data[ i ][ 'fn'+ j + 'description' ],
                                        value : undefined,
                                        call: _fnCaller( data[ i ].name, data[ i][ 'fn'+j++ ])
                                    };
                                else break;
                            }

                            spark.deviceInfo[ data[ i ].name ] = device;
                        }

                    }

                    console.log('spark data fetched successfully', spark.deviceInfo);
                }

                //fetch and parse spark data
                tableTop.get(app_data.google_spreadsheet.spark_data_key, parseSparkData);



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
                                    document.querySelector( 'div.events' )
                                ).top);
                }

                function scrollTo(n) {
                    n = n || 0;
                    document.querySelector('div.events').style.top = ( ( dom.events.initTop || 0 ) - 130*n ) + "px";
                }

                dom = {
                    events:{
                        scrollTo: scrollTo,
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
                    d.setMilliseconds(0);

                    return d;
                }
                function getShiftedDate(date, h, m, s){
                    if(!(date instanceof Date)) return undefined;
                    h = h || 0;
                    m = m || 0;
                    s = s || 0;
                    return new Date(date.getTime() + (h * 60 * 60 + m * 60 + s ) * 1000);
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
                    getShiftedDate: getShiftedDate,
                    percentage: percentage,
                    date: date
                }
            })



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
                        $scope.parseStatus = spark.parseStatus;
                        //put in an anonymous function to prevent angular dom error
                        $scope.togglePanel = function(){ dom.panel.toggle(); };
                        $scope.triggerFn = function(deviceName, fnName, args){
                            spark.deviceInfo[deviceName][fnName].call(args)
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
                                $scope.listeners.time = {};

                                var i, event, startStamp, endStamp, start, end, buffer,
                                    turnOnLight = function(){
                                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].lightsOn.call('1')
                                    },
                                    turnOffLight = function(){
                                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].lightsOn.call('0')
                                    },
                                    turnOnProjector = function(){
                                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].projectorOn.call('1')
                                    },
                                    turnOffProjector = function(){
                                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].projectorOn.call('0')
                                    };



                                for(i = 0; i < data.length; i++){


                                    event = data[i];
                                    start = time.getDate( data[i].start.split(':') );
                                    startStamp = start.getTime();
                                    end = time.getDate( data[i].end.split(':') );
                                    endStamp = end.getTime();

                                    if( i === 0 ){

                                    }

                                    if( i === data.length - 1 ){

                                    }

                                    if(event.type === "break"){

                                        buffer = time.getShiftedDate(start, 0, 0, 0).getTime();

                                        if($scope.listeners.time[buffer]){
                                            $scope.listeners.time[buffer].push( turnOnLight );
                                            $scope.listeners.time[buffer].push( turnOnProjector );
                                        }else{
                                            $scope.listeners.time[buffer] = [ turnOnLight, turnOnProjector ];
                                        }

                                        buffer = time.getShiftedDate(end, 0, 0, 0).getTime();

                                        if($scope.listeners.time[buffer]){
                                            $scope.listeners.time[buffer].push( turnOffLight );
                                        }else{
                                            $scope.listeners.time[buffer] = [ turnOffLight];
                                        }
                                    }


                                    if(event.type === "presentation"){
                                        buffer = time.getShiftedDate(start, 0, 0, 0).getTime();

                                        if($scope.listeners.time[buffer]){
                                            $scope.listeners.time[buffer].push( turnOffLight );
                                            $scope.listeners.time[buffer].push( turnOnProjector )
                                        }else{
                                            $scope.listeners.time[buffer] = [ turnOffLight, turnOnProjector ];
                                        }

                                    }

                                    if(event.type === "speech"){
                                        buffer = time.getShiftedDate(start, 0, 0, 0).getTime();

                                        if($scope.listeners.time[buffer]){
                                            $scope.listeners.time[buffer].push( turnOnLight );
                                            $scope.listeners.time[buffer].push( turnOffProjector );
                                        }else{
                                            $scope.listeners.time[buffer] = [ turnOnLight, turnOffProjector ];
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
                            if($scope.listeners.time) timeWatcher();

                        }



                        function timeWatcher(){
                            //console.log($scope.time.dateObj.getTime());
                            var i, stack = $scope.listeners.time[ $scope.time.dateObj.getTime() ];
                            if( stack ){
                                for(i in stack){
                                    if( stack.hasOwnProperty(i) ){
                                        stack[i]();
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



                            $scope.time.dateObj = new Date();
                            $scope.time.dateObj.setMilliseconds(0);

                            //refresh the clock
                            $scope.time.hour = _2d( $scope.time.dateObj.getHours() );

                            $scope.time.min = _2d( $scope.time.dateObj.getMinutes() );

                            $scope.time.sec = _2d( $scope.time.dateObj.getSeconds() );


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






