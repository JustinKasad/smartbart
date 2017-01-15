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

      for(var i = 0; i < stations.length; i++){
        abbrs.push({
                        value: stations[i]["abbr"],
                        display: stations[i]["name"]
                    });
      }

        scroller = mobiscroll.scroller('#bartInput', {
            theme: 'mobiscroll-dark',
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
//                 complete: function(xml) {
//                    var result = xmlToJSON.parseString(xml.responseText);
//                    return result.root["0"].schedule["0"].request["0"].trip;
//
//
//
//                    timesArray.push.apply(timesArray, result.root["0"].schedule["0"].request["0"].trip);
//                    if( app.checklastTrain(result.root["0"].schedule["0"].request["0"].trip[3]._attr.origTimeMin._value)){
//                        app.displayTimes(timesArray);
//                    } else {
//                        var newTime = result.root["0"].schedule["0"].request["0"].trip[3]._attr.origTimeMin._value;
//                        newTime = newTime.split(" ");
//                        var temp = newTime[0].split(':');
//                        if(parseInt(temp[1]) == 59){
//                            temp[0] = parseInt(temp[0]) + 1;
//                        } else {
//                            temp[1] = parseInt(temp[1]) + 1;
//                            if(temp[1].toString().length == 1){
//                                temp[1] =  "0" + temp[1].toString()
//                            }
//                        }
//                        newTime = temp.join(':') + newTime[1].toString().toLowerCase();
//                        setTimeout(function(){
//                            app.fetchTrainTimes(times, newTime);
//                        }, 200)
//                    }
//
//                 }
            });

    },
    displayTimes: function(trips){
        var i = 0;
        $('.spinner').fadeOut();
        $.each(trips, function(key, val){
            var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time" data-index='+i+'><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">'+val._attr.tripTime._value+'m';
            i++;

            if(val.leg.length > 1){
                html += '<span class="exclamation">!</span>';
            }
            html += '</div></div></a></li>';
            originArray.push(val._attr.origTimeMin._value);
            $('.times ul').append(html);
        });
        $('.infinite-scroll-preloader').show();
    },
    addDisplayTimes: function(trips){
        var i = 0;
        var noneWereAdded = true;
//        if($('.times ul li:last-child').find('.item-title').text() == trips[trips.length - 1]._attr.origTimeMin._value + ' - ' + trips[trips.length - 1]._attr.destTimeMin._value){
//            myApp.detachInfiniteScroll($$('.infinite-scroll'));
//            return;
//        }
        $.each(trips, function(key, val){
            var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time" data-index='+i+'><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">'+val._attr.tripTime._value+'m';
            i++;

            if(val.leg.length > 1){
                html += '<span class="exclamation">!</span>';
            }
            html += '</div></div></a></li>';
            if($.inArray(val._attr.origTimeMin._value, originArray) == -1){
                originArray.push(val._attr.origTimeMin._value)
                $('.times ul').append(html)
                noneWereAdded = false;
            }

        });
        arrayToDisplay = [];
        if(noneWereAdded){
            $('.infinite-scroll-preloader').hide();
        }

    },
    addPreviousDisplayTimes: function(trips){
        var i = 0;
        if($('.times ul li:first-child').find('.item-title').text() == trips[0]._attr.origTimeMin._value + ' - ' + trips[0]._attr.destTimeMin._value){
            myApp.destroyPullToRefresh($$('.pull-to-refresh-content'));
            return;
        }
        $.each(trips.reverse(), function(key, val){
            var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time" data-index='+i+'><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">'+val._attr.tripTime._value+'m';
            i++;

            if(val.leg.length > 1){
                html += '<span class="exclamation">!</span>';
            }
            html += '</div></div></a></li>';
            if($.inArray(val._attr.origTimeMin._value, originArray) == -1){
                originArray.push(val._attr.origTimeMin._value)
                $('.times ul').prepend(html)
            }
        });
        arrayToDisplay = [];

    },
    displayTrainData: function(i){

    },
    setEvents: function(){
        $('body').on('click', '.time', function(){
            var index = $(this).attr('data-index');
            console.log(JSON.stringify(timesArray[index]));
        });
        $('#bartInput').on('change', function(){
            var s = currentStations = $(this).val();
            localStorage.setItem('stations', s);
            timesArray = [];
            originArray = [];
            $('.times ul').empty();
            $('.spinner').fadeIn();
            myApp.attachInfiniteScroll($$('.infinite-scroll'));

            $.when( app.fetchTrainTimes(s, 'now', 4, 4) ).then(function( data, a, xml ) {
                var result = xmlToJSON.parseString(xml.responseText);
                timesArray.push.apply(timesArray, result.root["0"].schedule["0"].request["0"].trip);
                $.when( app.fetchTrainTimes(s, app.getNextTrainStartTime(timesArray, 'add'), 0, 4) ).then(function( data, a, xml ) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    timesArray.push.apply(timesArray, result.root["0"].schedule["0"].request["0"].trip);
                    app.displayTimes(timesArray);
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
                        app.addDisplayTimes(arrayToDisplay);
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
                    app.addPreviousDisplayTimes(arrayToDisplay);
                    myApp.pullToRefreshDone();

                });
            });
        });


    },
    getNextTrainStartTime: function(t, state){
        t = t[t.length - 1]._attr.origTimeMin._value;
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
        console.log(h + ":" + m + " " + end);

        return h + ":" + m + " " + end;

    },
    checklastTrain: function(time){
        time = time.split(' ');
        var temp = time[0].split(':');
        if(time[1].toLowerCase() == 'am' && (parseInt(temp[0]) == 12 || parseInt(temp[0]) == 1)){
            return true;
        } else {
            return false;
        }
    }
};
