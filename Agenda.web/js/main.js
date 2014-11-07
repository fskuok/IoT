;(function(){

	var agendaApp = angular.module('agendaApp', []);


	agendaApp.controller('agendaCtrl', ['$scope', function($scope){
		$scope.events = agendaData;
		$scope.calulateDuration = function(start, end){
			var sarr = start.split(':'),
				earr = end.split(':'),
				minsTotal = (earr[0] - sarr[0])*60 + (earr[1] - sarr[1]);
			return Math.floor(minsTotal/60) + ':' + (minsTotal%60)
		}
	}])
})();