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
var schedule;
var currentTimeInMinutes;
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
        StatusBar.styleDefault()
        var d = new Date();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var year = d.getFullYear();
        schedule = year + "-" + ((d.getMonth()+1) < 10 ? ("0" + (d.getMonth()+1)) : (d.getMonth()+1)) + "-" + (day < 10 ? ("0" + day) : day);

        currentTimeInMinutes = (d.getHours() * 60) + d.getMinutes();
        if(d.getHours() == 0){
            currentTimeInMinutes += (24*60);
        }

        var day = d.getDay();
        if(d == 0){
            app.setSchedule('sunday');
        } else if(d == 6){
            app.setSchedule('saturday');
        } else {
            app.setSchedule('weekday');
        }

        app.init('deviceready');
    },
    // Update DOM on a Received Event
    init: function(id) {
      myApp.showIndicator();
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
                        $('.toolbar-through .page-content').css('padding-bottom', $('.bartSpinner').height());
                        $('.train-information').css('bottom', $('.bartSpinner').height() + "px");
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
    setSchedule: function(scheduleType){
        var d = new Date();
        var day = d.getDay();

        switch(scheduleType){
            case 'weekday':
                if(day == 0 || day == 6){
                    var distance = (4 + 7 - day) % 7;
                    d.setDate(d.getDate() + distance);
                }
                break;
            case 'saturday':
                if(day > 0 && day < 6){
                    var distance = (6 + 7 - day) % 7;
                    d.setDate(d.getDate() + distance);
                }
                break;
            case 'sunday':
                if(day > 0 && day < 6){
                    var distance = (0 + 7 - day) % 7;
                    d.setDate(d.getDate() + distance);
                }
                break;

        }

        var month = d.getMonth() + 1;
        var day = d.getDate();
        var year = d.getFullYear();

        schedule = year + "-" + ((d.getMonth()+1) < 10 ? ("0" + (d.getMonth()+1)) : (d.getMonth()+1)) + "-" + (day < 10 ? ("0" + day) : day);

        app.setScheduleDropdown(scheduleType);
        myApp.closePanel();
        $('#bartInput').trigger('change');        

    },
    setScheduleDropdown: function(scheduleType){
        $('.schedule-selected').addClass('schedule-set').removeClass('schedule-selected');
        $('.schedule-set[data="'+scheduleType+'"]').removeClass('schedule-set').addClass('schedule-selected');
        $(".scheduleList i").addClass('fa-caret-down').removeClass('fa-caret-up');
        $('.schedule-set').hide();
    },
    getFullTrainTimes: function(s){
        s = s.split(' ');
        if(s[0] == s[1]){
            $('.noTrains').show();
            return;
        } else {
            $('.noTrains').hide();
        }
         var url = "http://www.bart.gov/schedules/extended?orig="+s[0]+"&dest="+s[1]+"&type=departure&date=" + schedule;
         $.get( url, function( data ) {
            var tr = $(data).find('#exsched tr');
            var cost = $(data).find('.smallblack')[0].textContent;
            tr.splice(0, 1);
            tr.each(function(key, val){
                var $_children = $(val).children();
                var obj = {
                    depart : $_children[0].textContent.trim(),
                    departTime : $_children[1].textContent
                }
                if($_children[8].textContent.trim().length){
                    obj.transfer = true;
                    obj.transferStation = $_children[3].textContent.trim();
                    obj.transferArrive = $_children[4].textContent;
                    obj.transferDepart = $_children[6].textContent;
                    obj.arrive = $_children[8].textContent.trim();
                    obj.arriveTime = $_children[9].textContent;
                } else {
                    obj.arrive = $_children[3].textContent.trim();
                    obj.arriveTime = $_children[4].textContent;
                }
                obj.cost = cost;

                var t = obj.departTime;
                var hours = Number(t.match(/^(\d+)/)[1]);
                var minutes = Number(t.match(/:(\d+)/)[1]);
                var AMPM = t.match(/\s(.*)$/)[1].trim();
                if(AMPM == "pm" && hours<12) hours = hours+12;
                if(AMPM == "am" && hours==12) hours = hours-12;
                obj.timeInMinutes = (hours * 60) + (minutes);
                if((hours == 0 || hours == 1) && AMPM == 'am'){
                    obj.timeInMinutes += (24*60);
                }
                timesArray.push(obj);
            })
            app.displayTimes(timesArray);
         });

    },
    getElevatorStatus: function(){
         var url = "http://api.bart.gov/api/bsa.aspx?cmd=elev&key=MW9S-E7SL-26DU-VV8V"
         $.ajax({
              type: "GET",
              url: url,
              dataType: "xml",
              async: false,
              contentType: "text/xml; charset=\"utf-8\"",
              complete: function(xml) {
                 var result = xmlToJSON.parseString(xml.responseText);
                 var data = result.root["0"].bsa["0"].description["0"]._text;
                 myApp.closePanel();
                 myApp.alert(data, 'Elevator Status');
              }
         });

    },
    getDelayStatus: function(){
         var url = "http://api.bart.gov/api/bsa.aspx?cmd=bsa&key=MW9S-E7SL-26DU-VV8V&date=today"
         $.ajax({
              type: "GET",
              url: url,
              dataType: "xml",
              async: false,
              contentType: "text/xml; charset=\"utf-8\"",
              complete: function(xml) {
                 var result = xmlToJSON.parseString(xml.responseText);
                 var data = result.root["0"].bsa["0"].description["0"]._text;
                 myApp.closePanel();
                 myApp.alert(data, 'Delay Status');
              }
         });

    },
    displayTimes: function(trips){
        var hasSelected = false
        $.each(trips, function(key, val){
            if(!hasSelected && typeof trips[(key + 1)] != "undefined" && trips[(key)].timeInMinutes > currentTimeInMinutes){
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time selected"><div class="item-inner"><div class="item-title">' + val.departTime + ' - ' + val.arriveTime + '</div><div class="item-after">';
                hasSelected = true;
            } else {
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time"><div class="item-inner"><div class="item-title">' + val.departTime + ' - ' + val.arriveTime + '</div><div class="item-after">';
            }
            if(val.transfer){
                html += '<span class="trainTransfer">Transfer</span>';
            }
            html += '</div></div></a></li>';
            $('.times ul').append(html);
        });
        if($(".time.selected").length){
            $('.times-page-content').scrollTop($(".time.selected").offset().top - ($('.times-page-content').height() / 2))
        }
//        $('.times-page-content').animate({
//            scrollTop: $(".time.selected").offset().top - ($('.times-page-content').height() / 2)
//        }, 500);
        myApp.hideIndicator();

    },
    displayTrainData: function(train){
        var origin = stations[train.depart];
        var dest = stations[train.arrive];

        var mapOrigin = origin.name.replace(/ /g, '+') + "+bart";
        var mapDest = dest.name.replace(/ /g, '+') + "+bart";
        $('.maps-link a').attr('href', 'https://www.google.com/maps/dir/'+mapOrigin+'/'+mapDest + '/data=!4m2!4m1!3e3');
        $('.sms-link').attr('share-data', encodeURIComponent("I will be arriving at " + dest.name + " Bart Station at " + train.arriveTime.replace(' ', '').toLowerCase()));


        var html = '<p>depart from <span>'+origin.name+'</span></p>';
        html += '<p class="time-details">'+train.departTime+' - ';
        if(train.transfer){
            html += train.transferArrive + '</p>'
            html += '<p>transfer at <span>'+stations[train.transferStation].name+'</span></p>';
            html += '<p class="time-details">'+train.transferDepart+' - ' + train.arriveTime + '</p>'
        } else {
            html += train.arriveTime + '</p>'
        }
        html += '<p>arrive at <span>'+dest.name+'</span></p>';

        html += '<p class="costSpacer">&nbsp;</p><p>Total Cost: <span>'+ train.cost +'</span></p>'

        $('.train-details').html(html);
    },
    socialShare: function(){
        var message = decodeURIComponent($('.sms-link').attr('share-data'));

        $('.shareSpinner, .shareIcon').toggle();
        setTimeout(function(){
            $('.shareSpinner, .shareIcon').toggle();
        }, 3000);

        var options = {
          message: message, // not supported on some apps (Facebook, Instagram)
        }

        var onSuccess = function(result) {
          console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
          console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }

        var onError = function(msg) {
          console.log("Sharing failed with message: " + msg);
        }

        window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);
    },
    setEvents: function(){
        $('body').on('click', '.time', function(){
            var index = $('.time').index(this)
            app.displayTrainData(timesArray[index]);
        });
        $('body').on('click', '.reverseTrip', function(){
            myApp.showIndicator();
            var reverse = currentStations.split(' ');
            reverse = reverse.reverse();
            scroller.setArrayVal(reverse, true, true, false);
        });
        $('body').on('click', '.schedule-selected', function(){
            if($(".scheduleList i").hasClass('fa-caret-down')){
                $(".scheduleList i").removeClass('fa-caret-down').addClass('fa-caret-up');
                $('.schedule-set').show();
            } else {
                $(".scheduleList i").addClass('fa-caret-down').removeClass('fa-caret-up');
                $('.schedule-set').hide();
            }

        });
        $('body').on('click', '.schedule-set', function(){
            var dateSelected = $(this).attr('data');
            app.setSchedule(dateSelected);
        });
        $('body').on('click', '.elevator-link', function(){
            app.getElevatorStatus();
        });
        $('body').on('click', '.delays-link', function(){
            app.getDelayStatus();
        });
        $('body').on('click', '.sms-link', function(){
            app.socialShare();
        });
        $('#bartInput').on('change', function(){
            var timeout;
            if(timeout){
                clearTimeout(timeout);
            }
            timeout = setTimeout(function(){
                myApp.showIndicator();
                myApp.closePanel();
                var s = currentStations = $('#bartInput').val();
                localStorage.setItem('stations', s);
                timesArray = [];
                originArray = [];
                $('.times ul').empty();
                myApp.attachInfiniteScroll($$('.infinite-scroll'));
                app.getFullTrainTimes(s);
            }, 500)
        });

    }
};
