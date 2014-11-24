

(function(){

'use strict';


angular.module('agendaApp', ['appData', 'agendaControllers'])



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

    //convert 1 digit number into 2 digits string
    .filter('x2', function(){
        return function(a){ return +a < 10 ? '0' + (+a) : a + '';}
    })

    //put space between camel case words
    .filter('spaceCamelCase', function(){
        return function(input){
            return input
                // insert a space before all caps
                .replace(/([A-Z])/g, ' $1')
                // uppercase the first character
                .replace(/^./, function (str) {
                    return str.toUpperCase();
                })
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
    .factory('spark', ['app_data', '$http', 'tableTop', function(app_data, $http, tableTop){

        var spark = {
                deviceInfo : {},
                getVar: getVar,
                triggerFn: callFn,
                updateVars: updateVars,
                parseStatus: parseStatus,
                handlers: {
                    turnOnLight: function () {
                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].lightsOn.call('1')
                    },
                    turnOffLight: function () {
                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].lightsOn.call('0')
                    },
                    turnOnProjector: function () {
                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].projectorOn.call('1')
                    },
                    turnOffProjector: function () {
                        spark.deviceInfo[ "Lights / Projector / Whiteboard" ].projectorOn.call('0')
                    }
                }
            };



        //internal APIs


        function _getUrl(deviceKey, varName){

            if( !deviceKey || !varName ){
                //throw new Error('Get Spark Url Error: [deviceKey]: ', deviceKey, '[varName]: ', varName);
            }

            return  (
                        "https://api.spark.io/v1/devices/" +
                        deviceKey + "/" +  varName +  //url
                        "?access_token=" + spark.deviceInfo["Spark Cloud"].key //query string
                    );

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


        //external APIs


        function getVar(deviceName, varName, onSuccess){


            //if key not specified, return
            if( !spark.deviceInfo[ deviceName ].key ) return undefined;

            $http
                .get( _getUrl( spark.deviceInfo[ deviceName ].key, varName ) )
                .success( function(data){
                    spark.deviceInfo[ deviceName ][ varName ].value = data.result || 0;
                    spark.deviceInfo[ deviceName ][ varName ].updateTimestamp = ( new Date() ).getTime();
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

        function parseStatus(status){
            if(status == 1) return 'on';
            else return 'off';
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

        function toDate(a){

            if( a instanceof Date) return a;
            if( typeof a === 'string') a = a.split(':');
            if( a.length < 3 ) a[2] = 0;

            return setHMS(new Date(), +a[0], +a[1], +a[2]);
        }
        //Calculate the duration between start and end
        //@param: String: 'xx:xx' | Date object, String: 'xx:xx' | Date object
        //@return: Array
        function duration(start, end){
            var secsTotal = Math.floor( (toDate(end) - toDate(start)) / 1000 );


            return [ Math.floor( secsTotal / 3600 ),
                     Math.floor(  secsTotal % 3600 / 60 ),
                     secsTotal%60 ]
        }

        function percentage(gone, total){
            var totalMins = total[0]*60 + total[1],
                goneMins = gone[0]*60 + gone[1];
            return goneMins / totalMins * 100;
        }


        function setHMS(date, h, m, s){
            s = s || 0;
            date.setHours( +h );
            date.setMinutes( +m );
            date.setSeconds( +s );
            return date;
        }

        function getHMS(date){
            return {
                h: date.getHours(),
                m: date.getMinutes(),
                s: date.getSeconds()
            }
        }

        return {
            duration: duration,
            getDate: getDate,
            getShiftedDate: getShiftedDate,
            percentage: percentage,
            date: date,
            setHMS: setHMS,
            getHMS: getHMS
        }
    });



})();






