/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var timesArray = [];
var scroller;
var count = 0;
var bottomLoading = false;
var arrayToDisplay = [];
var currentStations = [];
var originArray = [];
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.init('deviceready');
    },
    // Update DOM on a Received Event
    init: function(id) {
      var abbrs = [];

      for (var key in stations) {
        abbrs.push({
                        value: key,
                        display: stations[key]["name"]
                    });
      }

        scroller = mobiscroll.scroller('#bartInput', {
            theme: 'android-holo',
            display: 'inline',
            showLabel: true,
            circular: true,
            cssClass: 'bartSpinner',
            onShow: function(){
                        var height = $(window).height() - $('.bartSpinner').height();
                        $('.toolbar-through .page-content').css('height', height);

                    },
            wheels: [
                [{
                    label: 'Departs',
                    data: abbrs
                },{
                    label: 'Arrives',
                    data: abbrs
                },]
            ]
        });
        setTimeout(function(){
              if(localStorage && localStorage.getItem('stations')){
                  var stationsArray = localStorage.getItem('stations').split(' ');
                  scroller.setArrayVal(stationsArray, true, true, false);
              } else {
                  scroller.setArrayVal(["12TH", "16TH"], true, true, false);
              }
        }, 200)


        app.setEvents();


    },

    fetchTrainTimes: function(times, start, before, after){
        var s = times.split(' ');
        if(s[0] == s[1]){
            return;
        }
        var url = "http://api.bart.gov/api/sched.aspx?cmd=depart&b="+before+"&a="+after+"&orig="+s[0]+"&dest="+s[1]+"&time="+start+"&key=MW9S-E7SL-26DU-VV8V"
        return $.ajax({
                 type: "GET",
                 url: url,
                 dataType: "xml",
                 async: false,
                 contentType: "text/xml; charset=\"utf-8\""
            });

    },
    displayTimes: function(trips, status){
        var noneWereAdded = true;
//        var d = new Date();
//        var h = d.getHours();
//        var m = d.getMinutes();
//        var end = 'am';
//        if(h > 12){
//            h = h - 12;
//            end = 'pm';
//        }
//
        if(status == 'prev' && $('.times ul li:first-child').find('.item-title').text() == trips[0]._attr.origTimeMin._value + ' - ' + trips[0]._attr.destTimeMin._value){
            myApp.destroyPullToRefresh($$('.pull-to-refresh-content'));
            return;
        } else if(status == 'prev'){
            trips = trips.reverse();
        }

//        var originTime = val._attr.origTimeMin._value;

        $.each(trips, function(key, val){
            if(status == 'initial' && key == 4){
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time selected"><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">';
            } else {
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time"><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">';
            }
            if(val.leg.length > 1){
                html += '<i class="fa fa-subway"></i><i class="fa fa-subway"></i>';
            }
            html += val._attr.tripTime._value+'m' + '</div></div></a></li>';
            if($.inArray(val._attr.origTimeMin._value, originArray) == -1){
                originArray.push(val._attr.origTimeMin._value);
                if(status == 'prev'){
                    $('.times ul').prepend(html);
                } else {
                    $('.times ul').append(html);
                }
                noneWereAdded = false;
            }
        });
        if(status == 'initial'){
            $('.infinite-scroll-preloader').show();
        } else if(status == 'next' && noneWereAdded){
            $('.infinite-scroll-preloader').hide();
        }
        arrayToDisplay = [];
        $('.times').removeClass('loading');

    },
    displayTrainData: function(train){
        var origin = stations[train._attr.origin._value];
        var dest = stations[train._attr.destination._value];

        var mapOrigin = origin.name.replace(/ /g, '+') + "+bart";
        var mapDest = dest.name.replace(/ /g, '+') + "+bart";
        $('.maps-link a').attr('href', 'https://www.google.com/maps/dir/'+mapOrigin+'/'+mapDest + '/data=!4m2!4m1!3e3');
        $('.sms-link a').attr('href', 'sms:?body='+encodeURIComponent("I will be arriving at " + dest.name + " Bart Station at " + train._attr.destTimeMin._value.replace(' ', '').toLowerCase()));

        var html = '<p>depart from <span>'+origin.name+'</span></p>';
        html += '<p class="time-details">'+train.leg[0]._attr.origTimeMin._value+' - ' + train.leg[0]._attr.destTimeMin._value + '</p>'
        if(train.leg.length > 1){
            html += '<p>transfer at <span>'+stations[train.leg[0]._attr.destination._value].name+'</span></p>';
            html += '<p class="time-details">'+train.leg[1]._attr.origTimeMin._value+' - ' + train.leg[1]._attr.destTimeMin._value + '</p>'
        }
        html += '<p>arrive at <span>'+dest.name+'</span></p>';

        $('.train-details').html(html);

    },
    setEvents: function(){
        $('body').on('click', '.time', function(){
            var index = $('.time').index(this)
            app.displayTrainData(timesArray[index]);
        });
        $('body').on('click', '.reverseTrip', function(){
            $('.times').addClass('loading');
            var reverse = currentStations.split(' ');
            reverse = reverse.reverse();
            scroller.setArrayVal(reverse, true, true, false);
        });
        $('#bartInput').on('change', function(){
            $('.times').addClass('loading');
            var s = currentStations = $(this).val();
            localStorage.setItem('stations', s);
            timesArray = [];
            originArray = [];
            $('.times ul').empty();
            myApp.attachInfiniteScroll($$('.infinite-scroll'));

            $.when( app.fetchTrainTimes(s, 'now', 4, 4) ).then(function( data, a, xml ) {
                var result = xmlToJSON.parseString(xml.responseText);
                timesArray.push.apply(timesArray, result.root["0"].schedule["0"].request["0"].trip);
                $.when( app.fetchTrainTimes(s, app.getNextTrainStartTime(timesArray, 'add'), 0, 4) ).then(function( data, a, xml ) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    timesArray.push.apply(timesArray, result.root["0"].schedule["0"].request["0"].trip);
                    app.displayTimes(timesArray, 'initial');
                    if($('.infinite-scroll-preloader').offset().top < $('.page-content').height()){
                        $('.pull-to-refresh-content').trigger('ptr:refresh');
                    }
                    app.highlightNextTime()
                });
            });
        });

        $('.infinite-scroll').on('infinite', function () {
            if (bottomLoading) return;

            // Set loading flag
            bottomLoading = true;

            // Emulate 1s loading
            setTimeout(function () {
              // Reset loading flag
                bottomLoading = false;
                $.when( app.fetchTrainTimes(currentStations, app.getNextTrainStartTime(timesArray, 'add'), 0, 4) ).then(function( data, a, xml ) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    var clone = JSON.parse(JSON.stringify(result.root["0"].schedule["0"].request["0"].trip))
                    arrayToDisplay.push.apply(arrayToDisplay, result.root["0"].schedule["0"].request["0"].trip);
                    timesArray.push.apply(timesArray, clone);
                    $.when( app.fetchTrainTimes(currentStations, app.getNextTrainStartTime(timesArray, 'add'), 0, 4) ).then(function( data, a, xml ) {
                        var result = xmlToJSON.parseString(xml.responseText);
                        var clone2 = JSON.parse(JSON.stringify(result.root["0"].schedule["0"].request["0"].trip));
                        arrayToDisplay.push.apply(arrayToDisplay, result.root["0"].schedule["0"].request["0"].trip);
                        timesArray.push.apply(timesArray, clone2);
                        app.displayTimes(arrayToDisplay, 'next');
                    });
                });
            }, 1000);
        });
        $('.pull-to-refresh-content').on('ptr:refresh', function () {
            $.when( app.fetchTrainTimes(currentStations, app.getNextTrainStartTime(timesArray, 'previous'), 4, 0) ).then(function( data, a, xml ) {
                var result = xmlToJSON.parseString(xml.responseText);
                var clone = JSON.parse(JSON.stringify(result.root["0"].schedule["0"].request["0"].trip))
                arrayToDisplay = $.merge(result.root["0"].schedule["0"].request["0"].trip, arrayToDisplay);
                timesArray = $.merge(clone, timesArray);
                $.when( app.fetchTrainTimes(currentStations, app.getNextTrainStartTime(timesArray, 'previous'), 4, 0) ).then(function( data, a, xml ) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    var clone2 = JSON.parse(JSON.stringify(result.root["0"].schedule["0"].request["0"].trip));
                    arrayToDisplay = $.merge(result.root["0"].schedule["0"].request["0"].trip, arrayToDisplay);
                    timesArray = $.merge(clone2, timesArray);
                    app.displayTimes(arrayToDisplay, 'prev');
                    myApp.pullToRefreshDone();

                });
            });
        });


    },
    getNextTrainStartTime: function(t, state){
        if(state == 'add'){
            t = t[t.length - 1]._attr.origTimeMin._value;
        } else {
            t = t[0]._attr.origTimeMin._value;
        }
        console.log(t);
        t = t.split(" ");
        var temp = t[0].split(':');

        var d = new Date();
        if(t[1].toLowerCase() == 'pm'){
            d.setHours(parseInt(temp[0]) + 11);
        } else {
            d.setHours(temp[0] - 1);
        }
        d.setMinutes(temp[1]);
        if(state == 'add'){
            var newDateObj = new Date(d.getTime() + 60000);
        } else {
            var newDateObj = new Date(d.getTime() - 60000);
        }

        var h = newDateObj.getHours();
        var m = newDateObj.getMinutes();
        var end = 'am';
        h++;
        if(h > 12){
            h = h - 12;
            end = 'pm';
        }
        if(m < 10) m = "0" + m;
        console.log(h + ":" + m + " " + end);

        return h + ":" + m + " " + end;

    },
    highlightNextTime: function(){
        var d = new Date();
        var h = d.getHours();
        var m = d.getMinutes();
        var t;
        $('.time').each(function(key, val){
        	t = $(val).find('.item-title').text().split('-')[0];
        });
    }
};
