(function (module) {
    module.controller('maincontroller', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
        $scope.FormStatus = {
            SubmittedSuccessfully: false,
            SubmittedReturnedError: false,
            LoadingError:false,
            Loading:true,
            Sending: false,
            Error:'',
            Reset: function () {
                this.SubmittedSuccessfully = false;
                this.SubmittedReturnedError = false;
                this.Error = '';
            }
        };

        function WaitUntilGrecaptchaLoaded(callback) {
            setTimeout(function () {
                if (typeof grecaptcha === 'undefined')
                    WaitUntilGrecaptchaLoaded(callback);
                else
                    callback();
            }, 10);
        }
        
        WaitUntilGrecaptchaLoaded(function () {
            $http.get('http://localhost:56147/api/Sfwlead/RecaptchaSiteKey').then(function (result) {
                grecaptcha.render($('#recaptcha')[0], {
                     sitekey: result.data
                });
            }, function (error) {
                $scope.FormStatus.LoadingError = true;
                $scope.FormStatus.Error = error.data;
            }).finally(function () {
                $scope.FormStatus.Loading = false;
            });
        });

        var formFunctions = {
            Clean: function (form) {
                for (var prop in this) {
                    if (!this.hasOwnProperty(prop)) continue;
                    this[prop]=null;
                }
                form.$setPristine();
            }
        };
        $scope.Lead = Object.create(formFunctions);

        $scope.Submit = function (form) {
            $scope.FormStatus.Reset();
            if (form.$valid) {
                $scope.Lead.Grecaptcha=grecaptcha.getResponse();
                $scope.FormStatus.Sending = true;
                $http.post("http://localhost:56147/api/Sfwlead", JSON.stringify($scope.Lead))
                .then(function (result) {
                    $scope.FormStatus.SubmittedSuccessfully = true;
                    $timeout(function () {
                        $scope.FormStatus.Reset();
                    }, 4000);
                    $scope.Lead.Clean(form);
                    grecaptcha.reset();
                 },
                 function (error) {
                     $scope.FormStatus.Error = error.data;
                     $scope.FormStatus.SubmittedReturnedError = true;

                 }).finally(function () {
                     $scope.FormStatus.Sending = false;
                 });
            }
        }
    }]);
})(angular.module('salesforceapp'));