// link of the data sheet
var AGENDA_GOOGLE_SPREADSHEET_KEY = "1rGsUNIk_zhfuNUMglR-4My7vPqku-sZg8JBYkKp9Qf4",
	ACCESS_TOKEN = "6564c0732ab5d528aee3a4b84b9f35b77604d026",
	DEVICES = {
			"DOOR": "53ff6e066667574826422167"
		};

function RETURN_URL(DEVICE_KEY, VARIABLE_NAME){

	return  "https://api.spark.io/v1/devices/" +
					 DEVICE_KEY + "/" +  VARIABLE_NAME + "?access_token=" + ACCESS_TOKEN;

};


;(function(){

    'use strict';

	var agendaApp = angular.module('agendaApp', []);


	agendaApp.controller('asideCtrl', ['$scope', function($scope){

		//set date data
		$scope.date = function(){
			var arr = new Date().toString().split(' ')
			return arr[0] + ' | ' + arr[1] + ' ' + arr[2];
		};

		$scope.time = {};

		//Refresh the time for the clock
		function refreshTime(){
			var time = new Date();

			$scope.time.hour = 
					time.getHours() < 10 ? '0' + time.getHours(): time.getHours();
			$scope.time.min = 
					time.getMinutes() < 10 ? '0' + time.getMinutes(): time.getMinutes();
			$scope.time.sec = 
					time.getSeconds() < 10 ? '0' + time.getSeconds(): time.getSeconds();
			
		}

		//
		//$scope.$apply(refreshTime);

		//
		setInterval(function(){
			$scope.$apply(refreshTime);
		}, 1000);

	}]);

	agendaApp.controller('agendaCtrl', 

		['$scope', '$rootScope', '$http', function($scope, $rootScope, $http){

		//Calculate the interval of start and end
		//@param: String: 'xx:xx', String: 'xx:xx'
		//@return: Strings
		$scope.calulateDuration = function(start, end){
			var sarr = start.split(':'),
				earr = end.split(':'),
				minsTotal = (earr[0] - sarr[0])*60 + (earr[1] - sarr[1]);
			return Math.floor(minsTotal/60) + 'H' + (minsTotal%60) + 'M'
		};

		//check if now time is between a time period
		//@return: Boolean
		$scope.isOn = function(start, end, eventId){
			var s = new Date(), e = new Date(), n = new Date();

			s.setHours( start.split(':')[0] );
			s.setMinutes( start.split(':')[1] );
			s.setSeconds(0);
			e.setHours( end.split(':')[0] );
			e.setMinutes( end.split(':')[1] );
			e.setSeconds(0);

			


			//now hour is between start hour and end hour
			return ( s < n && n < e ) ? 
							(goTo(eventId), 'now')
							: undefined;
		}

		//using tabletop.js https://github.com/jsoma/tabletop 
		//to fetch data form google spreadsheet
		$scope.getDataFromGoogleSS = function() {
			var param = { 
							key: AGENDA_GOOGLE_SPREADSHEET_KEY,
							callback: function(data) { 
								$scope.$apply( function() {
									$scope.events = data;
								} );
							},
							simpleSheet: true 
						};

			Tabletop.init( param );
		};
		
		$scope.getDataFromGoogleSS();

	}]);
})();

function goTo(n) {
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

function getVar(deviceID, varName, onSuccess){
			$http
			.get(RETURN_URL(deviceID, varName))
			.success(onSuccess);
		}

function triggerFn(deviceID, funcName, args, onSuccess) {
	$http
		.post(RETURN_URL(DEVICES.DOOR, funcName), {"args": args})
		.success(onSuccess);
}
