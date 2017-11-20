$(function () {
    chrome.storage.local.get('configuration', function (storage) {
        $('#siteUrl').val(storage.configuration.siteUrl);
        $('#bugUrl').val(storage.configuration.bugUrl);
        $('#times').val(storage.configuration.times);
        $('#serviceUrl').val(storage.configuration.serviceUrl);
    });

    $('#form').on('submit', function () {
        var configuration = {
            siteUrl: $('#siteUrl').val(),
            bugUrl: $('#bugUrl').val(),
            times: $('#times').val(),
            serviceUrl: $('#serviceUrl').val()
        };

        chrome.storage.local.set({
            configuration: configuration
        }, function () {
            var background = chrome.extension.getBackgroundPage();
            background.start();
        });
    });
});
