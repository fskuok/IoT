AGENDA_GOOGLE_SPREAD_SHEET_KEY = "1rGsUNIk_zhfuNUMglR-4My7vPqku-sZg8JBYkKp9Qf4";


;(function(){

	var agendaApp = angular.module('agendaApp', []);

	agendaApp.controller('asideCtrl', ['$scope', function($scope){

		//set date data
		$scope.date = function(){
			var arr = new Date().toString().split(' ')
			return arr[0] + ' | ' + arr[1] + ' ' + arr[2];
		}

		$scope.time = {};

		//Refresh the time for the clock
		$scope.refresh = function(){
			var time = new Date();

			$scope.time.hour = 
					time.getHours() < 10 ? '0' + time.getHours(): time.getHours();
			$scope.time.min = 
					time.getMinutes() < 10 ? '0' + time.getMinutes(): time.getMinutes();
			$scope.time.sec = 
					time.getSeconds() < 10 ? '0' + time.getSeconds(): time.getSeconds();
			
		}

		//
		$scope.$apply($scope.refresh());

		//
		setInterval(function(){
			$scope.$apply($scope.refresh())
		}, 1000);

	}]);

	agendaApp.controller('agendaCtrl', ['$scope', '$rootScope', function($scope, $rootScope){

		//Calculate the interval of start and end
		//@param: String: 'xx:xx', String: 'xx:xx'
		//@return: things
		$scope.calulateDuration = function(start, end){
			var sarr = start.split(':'),
				earr = end.split(':'),
				minsTotal = (earr[0] - sarr[0])*60 + (earr[1] - sarr[1]);
			return Math.floor(minsTotal/60) + 'H' + (minsTotal%60) + 'M'
		}


		//using tabletop.js https://github.com/jsoma/tabletop 
		//to fetch data form google spreadsheet
		$scope.getDataFromGoogleSS = function() {
			var param = { 
							key: AGENDA_GOOGLE_SPREAD_SHEET_KEY,
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

