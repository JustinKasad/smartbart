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
var schedule;
var currentTimeInMinutes;
var timeout;
var displayDate;
var dateTextArray = [];
var scrollLockForiOS = false;
var offlineTimer;
var dontUpdateDisplayDate = false;
var showingAlert = false;
var zoomed = false;

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
        document.addEventListener("resume", this.onResume, false);
        document.addEventListener("offline", this.offline, false);
        document.addEventListener("online", this.online, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    online: function(){
        if(offlineTimer){
            clearTimeout(offlineTimer);
        }
        if(!$('.times ul li').length){
            app.wheelChanged();
        }
    },
    offline: function(){
        if(offlineTimer){
            clearTimeout(offlineTimer);
        }

        offlineTimer = setTimeout(function(){return false;
            if(!showingAlert){
                showingAlert = true;
                myApp.alert("Please connect to a network.", 'No Internet', function(){
                    showingAlert = false;
                });
            }
        }, 2000)

    },
    onResume: function(){
        app.setCurrentTimeInMinutes();
        app.scrollToCurrentTime();
    },
    onDeviceReady: function() {
        StatusBar.styleDefault()
        var d = displayDate = new Date();

        app.setCurrentTimeInMinutes();
//        app.setDateString(d, false);
//
//        var day = d.getDay();
//        if(day == 0){
//            app.setSchedule('sunday', true);
//        } else if(day == 6){
//            app.setSchedule('saturday', true);
//        } else {
//            app.setSchedule('weekday', true);
//        }

        app.init('deviceready');
    },
    setCurrentTimeInMinutes: function(){
        var d = new Date();
        currentTimeInMinutes = (d.getHours() * 60) + d.getMinutes();
        if(d.getHours() == 0){
            currentTimeInMinutes += (24*60);
        }
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
                $('.toolbar-through .times-page-content').css('padding-bottom', $('.bartSpinner').height());
            },
            onChange: app.wheelChanged,
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
                  scroller.setArrayVal(stationsArray, true, false, false);
              } else {
                  scroller.setArrayVal(["12TH", "16TH"], true, false, false);
              }
              app.wheelChanged();
        }, 200)


        app.setEvents();


    },
    setDateString(d, append){
        var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var dateString = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();

        var month = d.getMonth() + 1;
        var day = d.getDate();
        var year = d.getFullYear();
        schedule = year + "-" + ((d.getMonth()+1) < 10 ? ("0" + (d.getMonth()+1)) : (d.getMonth()+1)) + "-" + (day < 10 ? ("0" + day) : day);


        if(append){
            $('.times ul').append('<div class="dateText inline">'+ dateString +'</div>');
        } else {
            dateTextArray = [dateString];
            $('.dateText.inline').remove();
            $('.today.dateText').text(dateString);
        }

    },
    setSchedule: function(scheduleType, dontTrigger){
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
        displayDate = d;
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var year = d.getFullYear();

        schedule = year + "-" + ((d.getMonth()+1) < 10 ? ("0" + (d.getMonth()+1)) : (d.getMonth()+1)) + "-" + (day < 10 ? ("0" + day) : day);
        app.setDateString(d, false);
        app.setScheduleDropdown(scheduleType);
        myApp.closePanel();
        dontUpdateDisplayDate = true;
        if(dontTrigger){}
        else {
            app.wheelChanged();
        }

    },
    setScheduleDropdown: function(scheduleType){
        $('.schedule-selected').addClass('schedule-set').removeClass('schedule-selected');
        $('.schedule-set[data="'+scheduleType+'"]').removeClass('schedule-set').addClass('schedule-selected').show();
        $(".scheduleList i").addClass('fa-caret-down').removeClass('fa-caret-up');
        $('.schedule-set').hide();
    },
    getFullTrainTimes: function(s, fetchDate, first){
        s = s.split(' ');
        if(s[0] == s[1]){
            $('.noTrains').show();
            return;
        } else {
            $('.noTrains').hide();
        }
         var url = "http://www.bart.gov/schedules/extended?orig="+s[0]+"&dest="+s[1]+"&type=departure&date=" + fetchDate;
//         var url = "../offline-schedule.htm";
         $.get( url, function( data ) {
            var tr = $(data).find('#exsched tr');
            var cost = $(data).find('.smallblack')[0].textContent;
            tr.splice(0, 1);
            if(first){
                timesArray.length = 0;
            }
            arrayToDisplay.length = 0;
            tr.each(function(key, val){
                var $_children = $(val).children();
                var obj = {
                    depart : $_children[0].textContent.trim(),
                    departTime : $_children[1].textContent
                };
                if($_children[13].textContent.trim().length){
                    obj.doubleTransfer = true;
                    obj.transfer = true;
                    obj.transferStation = $_children[3].textContent.trim();
                    obj.transferArrive = $_children[4].textContent;
                    obj.transferDepart = $_children[6].textContent;
                    obj.trainTransferDestination = $($_children[2]).find('img').attr('alt');
                    obj.trainTransferDestinationColor = $($_children[2]).attr('bgcolor');
                    obj.transfer2Station = $_children[8].textContent.trim();
                    obj.transfer2Arrive = $_children[9].textContent;
                    obj.transfer2Depart = $_children[11].textContent;
                    obj.trainTransfer2Destination = $($_children[7]).find('img').attr('alt');
                    obj.trainTransfer2DestinationColor = $($_children[7]).attr('bgcolor');
                    obj.trainDestination = $($_children[12]).find('img').attr('alt');
                    obj.trainDestinationColor = $($_children[12]).attr('bgcolor');
                    obj.arrive = $_children[13].textContent.trim();
                    obj.arriveTime = $_children[14].textContent;
                }else if($_children[8].textContent.trim().length){
                    obj.transfer = true;
                    obj.transferStation = $_children[3].textContent.trim();
                    obj.transferArrive = $_children[4].textContent;
                    obj.transferDepart = $_children[6].textContent;
                    obj.trainTransferDestination = $($_children[2]).find('img').attr('alt');
                    obj.trainTransferDestinationColor = $($_children[2]).attr('bgcolor');
                    obj.trainDestination = $($_children[7]).find('img').attr('alt');
                    obj.trainDestinationColor = $($_children[7]).attr('bgcolor');
                    obj.arrive = $_children[8].textContent.trim();
                    obj.arriveTime = $_children[9].textContent;
                } else {
                    obj.arrive = $_children[3].textContent.trim();
                    obj.arriveTime = $_children[4].textContent;
                    obj.trainDestination = $($_children[2]).find('img').attr('alt');
                    obj.trainDestinationColor = $($_children[2]).attr('bgcolor');
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
                arrayToDisplay.push(obj);
            })
            app.displayTimes(arrayToDisplay, first);
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
    getDelayStatus: function(hideAlert){
         var url = "http://api.bart.gov/api/bsa.aspx?cmd=bsa&key=MW9S-E7SL-26DU-VV8V&date=today"
         $.ajax({
              type: "GET",
              url: url,
              dataType: "xml",
              async: false,
              contentType: "text/xml; charset=\"utf-8\"",
              complete: function(xml) {
                 var result = xmlToJSON.parseString(xml.responseText);
                 var data = '';
                 $.each(result.root["0"].bsa, function(key, val){
                    data += val.description["0"]._text;
                    if(result.root["0"].bsa.length > 1){
                        data += "\n ";
                    }
                 })
                 $('.delayStatusExclamation').hide();
                 if(hideAlert && data != "No delays reported."){
                    $('.delayStatusExclamation').show();
                 } else if(typeof hideAlert == "undefined"){
                     myApp.closePanel();
                     myApp.alert(data, 'Delay Status');
                 }
              }
         });

    },
    displayTimes: function(trips, first){
        var hasSelected = false;
        $.each(trips, function(key, val){
            if(first && !hasSelected && trips[(key)].timeInMinutes > currentTimeInMinutes){
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time selected"><div class="item-inner"><div class="item-title">' + val.departTime + '&mdash; ' + val.arriveTime + '</div><div class="item-after">';
                hasSelected = true;
            } else {
                var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time"><div class="item-inner"><div class="item-title">' + val.departTime + '&mdash; ' + val.arriveTime + '</div><div class="item-after">';
            }
            if(val.transfer || val.doubleTransfer){
                html += '<span class="trainTransfer">Transfer</span>';
            }
            html += '</div></div></a></li>';
            $('.times ul').append(html);
        });
        if(first){
            this.scrollToCurrentTime();
        }
        if(!first){
            bottomLoading = false;
        }
//        $('.times-page-content').animate({
//            scrollTop: $(".time.selected").offset().top - ($('.times-page-content').height() / 2)
//        }, 500);
        $('.infinite-scroll-preloader').show();
        myApp.hideIndicator();
    },
    scrollToCurrentTime: function(){
        if($(".time.selected").length){
            $('.times-page-content').scrollTop(0);
            var scrollTo = $(".time.selected").offset().top - ($('.times-page-content').height() / 2);
            $('.times-page-content').scrollTop(scrollTo);
            for(var i=0; i < 10; i++){
                $('.times-page-content').trigger('scroll');
            }
//            setTimeout(function(){
//                app.isScrolling();
//            }, 150);

        } else {
            $('.times-page-content').scrollTop($(".time").last().offset().top);
        }
    },
    displayTrainData: function(train){
        var origin = stations[train.depart];
        var dest = stations[train.arrive];

        var mapOrigin = origin.name.replace(/ /g, '+') + "+bart";
        var mapDest = dest.name.replace(/ /g, '+') + "+bart";
        $('.maps-link a .item-title').text('Directions to ' + origin.name + " Bart");
        $('.maps-link a').attr('href', 'https://www.google.com/maps?saddr=My+Location&daddr='+mapOrigin);
//        $('.maps-link a').attr('href', 'https://www.google.com/maps/dir/'+mapOrigin+'/'+mapDest + '/data=!4m2!4m1!3e3');
        $('.sms-link').attr('share-data', encodeURIComponent("I will be arriving at " + dest.name + " Bart Station at " + train.arriveTime.replace(' ', '').toLowerCase()));

        if(train.doubleTransfer){
            var html = '<p><span>'+origin.name+'</span> to <span>'+stations[train.transferStation].name+'</span></p>';
            html += '<p class="time-details">'+train.departTime+' - ' + train.transferArrive + '<span class="trainTowards" style="background: '+train.trainTransferDestinationColor+'">'+train.trainTransferDestination+' train</span></p>';
            html += '<p><span>'+stations[train.transferStation].name+'</span> to <span>'+stations[train.transfer2Station].name+'</span></p>';
            html += '<p class="time-details">'+train.transferDepart+' - ' + train.transfer2Arrive + '<span class="trainTowards" style="background: '+train.trainTransfer2DestinationColor+'">'+train.trainTransfer2Destination+' train</span>' + '</p>';
            html += '<p><span>'+stations[train.transfer2Station].name+'</span> to <span>'+dest.name+'</span></p>';
            html += '<p class="time-details">'+train.transfer2Depart+' - ' + train.arriveTime + '<span class="trainTowards" style="background: '+train.trainDestinationColor+'">'+train.trainDestination+' train</span></p>';
        }else if(train.transfer && !train.doubleTransfer){
            var html = '<p><span>'+origin.name+'</span> to <span>'+stations[train.transferStation].name+'</span></p>';
            html += '<p class="time-details">'+train.departTime+' - ' + train.transferArrive + '<span class="trainTowards" style="background: '+train.trainTransferDestinationColor+'">'+train.trainTransferDestination+' train</span></p>'
            html += '<p><span>'+stations[train.transferStation].name+'</span> to <span>'+dest.name+'</span></p>';
            html += '<p class="time-details">'+train.transferDepart+' - ' + train.arriveTime + '<span class="trainTowards" style="background: '+train.trainDestinationColor+'">'+train.trainDestination+' train</span></p>'
        } else {
            var html = '<p><span>'+origin.name+'</span> to <span>'+dest.name+'</span></p>';
            html += '<p class="time-details">'+train.departTime+' - ' + train.arriveTime + '<span class="trainTowards" style="background: '+train.trainDestinationColor+'">'+train.trainDestination+' train</span></p>'
        }



        html += '<p class="costSpacer">&nbsp;</p><p>Total Cost: <span>'+ train.cost +'</span></p>'

        $('.panel-right .map-container').attr('data-origin', train.depart);
        $('.panel-right .map-container').attr('data-destination', train.arrive);


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
    shareWithFriends: function(){
        $('.shareSpinner, .shareIcon').toggle();
        setTimeout(function(){
            $('.shareSpinner, .shareIcon').toggle();
        }, 3000);

        var options = {
          message: 'Try SmartBart, The smarter way to find BART train times.', // not supported on some apps (Facebook, Instagram)
          subject: 'SmartBart SF', // fi. for email
          url: 'http://www.smartbartsf.com',
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
    isScrolling: function(){
        var dateHeight = $('.dateText').height();
        var $_dateText = $('.dateText.inline:not(.scrolledNorth)').first();

        if($_dateText.length && $_dateText.position().top <= ($('.times-page-content').scrollTop() - (device.platform == "iOS" ? (dateHeight*2) : dateHeight))){
            $_dateText.addClass('scrolledNorth');
            if(!dateTextArray.length){
                dateTextArray.push($('.dateText.today').text());
            }
            dateTextArray.push($_dateText.text());
            $('.dateText.today').text($_dateText.text());
//            $_dateText.addClass('stickied').next().css('margin-top', dateHeight + 'px');
        } else if($('.dateText.scrolledNorth').length && isScrolledIntoView($('.dateText.scrolledNorth').last().next())){
            $('.dateText.today').text(dateTextArray[dateTextArray.length - 2]);
            dateTextArray.pop()
            $('.dateText.scrolledNorth').last().removeClass('scrolledNorth');

//            $('.dateText.stickied').last().removeClass('stickied').next().css('margin-top', '0');
        }
    },
    wheelChanged: function(event, inst){
//          if(timeout){
//              clearTimeout(timeout);
//          }
//          timeout = setTimeout(function(){
              myApp.showIndicator();
              $('.infinite-scroll-preloader').hide();
              myApp.closePanel();
              var s = currentStations = $('#bartInput').val();
              localStorage.setItem('stations', s);
              timesArray.length = 0;
              dateTextArray.length = 0;
              $('.times ul').empty();
              if(!dontUpdateDisplayDate){
                  displayDate = new Date();
                  app.setDateString(displayDate, false);
                  var day = displayDate.getDay();
                  if(day == 0){
                      app.setScheduleDropdown('sunday');
                  } else if(day == 6){
                      app.setScheduleDropdown('saturday');
                  } else {
                      app.setScheduleDropdown('weekday');
                  }
              } else {
                dontUpdateDisplayDate = false;
              }

              app.getFullTrainTimes(s, schedule, true);
              app.getDelayStatus(true)
//          }, 500)
      },
    setMapMarkers: function(fullScreen){
        $('.map-marker').hide();
          setTimeout(function(){
            fullScreen ? $('#bartMap').imageMapResize() : $('#bartMapSmall').imageMapResize();
            setTimeout(function(){
                var currentStationsArray = currentStations.split(' ');
                var height = fullScreen ? $('.map-container-full .map-marker').height() : $('.map-container .map-marker').height();
                var coordsOrigin, x, y;
                for(var i = 0; i < 2; i++){
                    coordsOrigin = fullScreen ? $('#bartMap area[alt='+currentStationsArray[i]+']') : $('#bartMapSmall area[alt='+currentStationsArray[i]+']');
                    coordsOrigin = coordsOrigin.attr('coords').split(',');
                    x = parseInt(coordsOrigin[0]) - (height / 2);
                    y = parseInt(coordsOrigin[1]) - height;
                    fullScreen ? $($('.map-container-full .map-marker')[i]).css({left: x, top: y}).attr('data', currentStationsArray[i]).fadeIn() : $($('.map-container .map-marker')[i]).css({left: x, top: y}).attr('data', currentStationsArray[i]).fadeIn();
                }
//                $('#mapContainer .page-content').scrollLeft($(window).width() / 2);

            },200)
          }, 300)
    },
    zoomMap: function(){
        if(zoomed){
                    $(this).find('i').removeClass('fa-search-minus').addClass('fa-search-plus');
                    $('.bart_image_full').css('width', '100%');
                } else {
                    $(this).find('i').removeClass('fa-search-plus').addClass('fa-search-minus');
                    $('.bart_image_full').css('width', '250%');
                }
                $('.map-container-full').toggleClass('zoomed');
                app.setMapMarkers(true);
                zoomed = !zoomed;
    },
    setEvents: function(){
        $('body').on('click', '.time', function(){
            var index = $('.time').index(this);
            app.setMapMarkers(false);
            app.displayTrainData(timesArray[index]);
        });
        $('body').on('click', '.reverseTrip', function(){
            myApp.showIndicator();
            var reverse = currentStations.split(' ');
            reverse = reverse.reverse();
            scroller.setArrayVal(reverse, true, true, false);
            app.wheelChanged();
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
        $('body').on('click', '.shareWithFriends', function(){
            app.shareWithFriends();
        });
        $('body').on('click', '.bartMap-link', function(){
            myApp.closePanel();
            if($(this).closest('.panel-left').length){
                $('.train-details-on-map').empty();
                $('.map-container-full').addClass('hideMarkers');
            } else {
                $('.map-container-full').removeClass('hideMarkers');
            }
            mainView.router.load({pageName: 'bartMap'});
        });
        $('.infinite-scroll').on('infinite', function () {
            if (bottomLoading || !$('.times ul li').length) return;

            // Set loading flag
            bottomLoading = true;

            // Emulate 1s loading
            setTimeout(function () {
              // Reset loading flag
                displayDate.setDate(displayDate.getDate() + 1);
                app.setDateString(displayDate, true);
                var day = displayDate.getDate();
                var year = displayDate.getFullYear();
                var tempSchedule = year + "-" + ((displayDate.getMonth()+1) < 10 ? ("0" + (displayDate.getMonth()+1)) : (displayDate.getMonth()+1)) + "-" + (day < 10 ? ("0" + day) : day);
                app.getFullTrainTimes(currentStations, tempSchedule, false);
            }, 1000);
        });

        $('.times-page-content').on('scroll', app.isScrolling);

        $$('.panel').on('panel:close', function () {
            $('.bartSpinner').removeClass('hide')
        });
        $$('.panel').on('panel:open', function () {
            $('.bartSpinner').addClass('hide');
        });
        myApp.onPageBeforeAnimation('bartMap', function (page) {console.log('page open');
          $('.bartSpinner').addClass('hide');
//          $('.map-marker').hide();
        });
        myApp.onPageAfterAnimation('bartMap', function (page) {console.log('page open');
            app.setMapMarkers(true);

        });
        myApp.onPageBack('bartMap', function (page) {console.log('page close');
          $('.bartSpinner').removeClass('hide');
        });


        $('.zoom-link').on('click', app.zoomMap)
    }
};
function isScrolledIntoView(elem)
{
    var docViewTop = $(window).scrollTop();
    var elemTop = $(elem).offset().top;
    return elemTop >= (docViewTop + 70);
}
