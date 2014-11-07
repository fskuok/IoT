;(function(){

	var agendaApp = angular.module('agendaApp', []);

	agendaApp.controller('asideCtrl', ['$scope', function($scope){
		$scope.date = function(){
			var arr = new Date().toString().split(' ')
			return arr[0] + ' | ' + arr[1] + ' ' + arr[2];
		}
	}]);

	agendaApp.controller('agendaCtrl', ['$scope', function($scope){
		$scope.events = agendaData;
		$scope.calulateDuration = function(start, end){
			var sarr = start.split(':'),
				earr = end.split(':'),
				minsTotal = (earr[0] - sarr[0])*60 + (earr[1] - sarr[1]);
			return Math.floor(minsTotal/60) + 'H' + (minsTotal%60) + 'M'
		}
	}]);
})();

