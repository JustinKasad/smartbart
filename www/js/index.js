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
var showingAlert = false;
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
            $('#bartInput').trigger('change');
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
        app.setDateString(d, false);

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
                        $('.toolbar-through .page-content').css('padding-bottom', $('.bartSpinner').height());
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
        $('#bartInput').trigger('change', [{dontUpdateDisplayDate:true}]);

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
//            var data = '<!doctype html> <!--[if IE 7]> <html class="no-js ie7 oldie" lang="en" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:og="http://ogp.me/ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:sioc="http://rdfs.org/sioc/ns#" xmlns:sioct="http://rdfs.org/sioc/types#" xmlns:skos="http://www.w3.org/2004/02/skos/core#" xmlns:xsd="http://www.w3.org/2001/XMLSchema#" lang="en" dir="ltr"> <![endif]--> <!--[if IE 8]> <html class="no-js ie8 oldie" lang="en" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:og="http://ogp.me/ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:sioc="http://rdfs.org/sioc/ns#" xmlns:sioct="http://rdfs.org/sioc/types#" xmlns:skos="http://www.w3.org/2004/02/skos/core#" xmlns:xsd="http://www.w3.org/2001/XMLSchema#" lang="en" dir="ltr"> <![endif]--> <!--[if gt IE 8]><!--> <html class="no-js page-schedules-extended" lang="en" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:og="http://ogp.me/ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:sioc="http://rdfs.org/sioc/ns#" xmlns:sioct="http://rdfs.org/sioc/types#" xmlns:skos="http://www.w3.org/2004/02/skos/core#" xmlns:xsd="http://www.w3.org/2001/XMLSchema#" lang="en" dir="ltr"> <!--<![endif]--> <head> <title>QuickPlanner Legends | bart.gov</title> <meta http-equiv="Content-Type" content="text/html; charset=utf-8" /> <meta name="Generator" content="Drupal Mothership" /> <meta name="Generator" content="Drupal 7 (http://drupal.org)" /> <link rel="shortcut icon" href="https://www.bart.gov/sites/all/themes/bart_desktop/favicon.ico" /> <link rel="apple-touch-icon" sizes="144x144" href="https://www.bart.gov/sites/all/themes/bart_desktop/apple-touch-icon-144x144.png"><link rel="apple-touch-icon" sizes="114x114" href="https://www.bart.gov/sites/all/themes/bart_desktop/apple-touch-icon-114x114.png"> <link rel="apple-touch-icon" sizes="72x72" href="https://www.bart.gov/sites/all/themes/bart_desktop/apple-touch-icon-72x72.png"> <link rel="apple-touch-icon" href="https://www.bart.gov/sites/all/themes/bart_desktop/apple-touch-icon.png"> <link rel="apple-touch-startup-image" href="https://www.bart.gov/sites/all/themes/bart_desktop/apple-startup.png"> <meta name="MobileOptimized" content="width"> <meta name="HandheldFriendly" content="true"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="cleartype" content="on"> <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"> <link rel="stylesheet" href="https://www.bart.gov/sites/default/files/css/css_xE-rWrJf-fncB6ztZfd2huxqgxu4WO-qwma6Xer30m4.css" /> <link rel="stylesheet" href="https://www.bart.gov/sites/default/files/css/css_p7_Hzt5AzNi2nK6Hoot7Nl2c5Ew4fwLN-mzImdLqK-U.css" /> <link rel="stylesheet" href="https://www.bart.gov/sites/default/files/css/css_QW1pWeay3Ate7PA5Dfskpl25BHKUsqD2fFiYxRiA9eU.css" /> <link rel="stylesheet" href="https://www.bart.gov/sites/default/files/css/css_Z9uRqu0AGzQe-9g3yh3GCz3Ld_tMio6BqAC_8tjCrbo.css" /> <!--[if lte IE 8]> <link rel="stylesheet" media="print" href="/sites/all/themes/bart_desktop/css/print.css" type="text/css" /> <![endif]--> <!--[if lt IE 9]> <script src="https://www.bart.gov/sites/all/themes/mothership/mothership/js/html5.js"></script> <![endif]--> </head> <body class="not-front not-logged-in one-sidebar sidebar-second page-schedules page-schedules-extended domain-bartdev-prod-acquia-sites-com" > <a href="#main-content" class="element-invisible element-focusable utility-nav">Skip to main content</a> <div class="region-content clearfix page-accessible"> <div id="container"> <span style="position:absolute;"><a name="content" id="content">&nbsp;</a></span> <div id="main" class="station-to-station"> <table border="0" cellpadding="0" cellspacing="0" width="537"> <tbody><tr><td colspan="2" align="right"><br> <a href="" onclick="self.close()">Close this window</a></td></tr> <tr> <td width="27"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="27" height="1" alt="" border="0"></td> <td> <table border="0" cellpadding="0" cellspacing="0"> <tbody><tr> <td width="474" align="left"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="1" height="6" alt="" border="0"><br><table border="0" cellpadding="2" cellspacing="0"> <tbody><tr> <td><strong>Extended Schedule</strong><br><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="259" height="1" alt="" border="0"></td> <td align="left"><b>Fare: </b><b class="smallblack">$6.25</b><br><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="180" height="1" alt="" border="0"></td> </tr> </tbody></table> <table border="0" cellpadding="0" cellspacing="0"> <tbody><tr> <td bgcolor="#cccccc"> <table class="border-spacing" border="0" cellpadding="2" cellspacing="1"> <tbody><tr class="small"> <td bgcolor="#ffffff">Depart: <a href="/stations/MLBR">Millbrae</a><br>Arrive: <a href="/stations/CAST">Castro Valley</a><br><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="257" height="1" alt="" border="0"></td> <td bgcolor="#ffffff">Date: <a class="smallblack">2/13/2017</a><br>Departing Around:&nbsp;<a class="smallblack"></a><br><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="257" height="1" alt="" border="0"></td> </tr> </tbody></table> </td> </tr> </tbody></table><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="1" height="10" alt="" border="0"><br> <div id="exsched"> <table border="0" cellpadding="0" cellspacing="0" width="474"> <tbody><tr> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="6"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="1" alt="" border="0"></td> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="6"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="1" alt="" border="0"></td> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="6"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="1" alt="" border="0"></td> <td width="36"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="36" height="1" alt="" border="0"></td> <td width="40"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="40" height="1" alt="" border="0"></td> <td width="50"><img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="50" height="1" alt="" border="0"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">4:18 am&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank"  return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:42 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">4:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">4:33 am&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:57 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" > <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">4:48 am&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:12 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:09 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">5:03 am&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:27 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:24 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">5:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:24 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">5:18 am&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:42 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">5:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">5:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">6:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:09 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">6:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:26 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">6:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:41 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">6:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:56 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">7:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:11 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">7:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:26 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">7:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:41 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">7:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">8:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:09 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">8:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:24 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">8:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">8:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">9:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:09 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">9:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:24 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">9:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">9:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">10:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:09 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">10:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:24 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">10:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:39 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">10:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:04 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:10 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:54 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">11:01 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:19 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:25 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">11:16 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:34 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:40 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">11:31 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:49 am&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:55 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">11:46 am&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">12:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">12:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">12:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">12:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">12:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">1:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">12:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">12:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">12:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">1:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">12:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">12:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">12:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">1:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">12:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">1:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">1:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">1:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">1:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">1:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">1:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">2:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">1:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">1:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">1:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">2:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">1:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">1:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">1:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">2:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">1:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">2:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">2:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">2:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">2:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">2:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">2:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">3:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">2:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">2:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">2:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">3:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">2:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">2:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">2:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">3:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">2:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">3:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">3:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">3:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">3:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">3:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">3:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">4:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">3:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">3:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">3:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">4:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">3:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">3:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">3:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">4:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">3:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">4:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">4:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">4:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">4:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">4:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">4:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">4:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">4:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">4:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">4:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">5:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">5:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">5:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">5:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">5:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">5:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">5:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:10 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">6:54 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">6:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:25 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:09 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">6:16 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:34 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:40 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:24 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">6:31 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">6:49 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">6:55 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:39 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">6:46 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:04 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:13 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">7:58 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">7:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:33 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:18 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">7:21 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:39 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">7:53 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:38 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">7:41 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">7:59 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:13 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">8:58 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">8:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:33 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:18 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">8:21 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:39 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">8:53 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:38 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">8:41 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">8:59 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:13 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">9:58 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">9:01 pm&nbsp;</td> <td bgcolor="#ff0000" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="RICH" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:19 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:33 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:18 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">9:21 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">9:46 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">9:53 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:38 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">9:41 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:06 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:13 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">10:58 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">10:01 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:26 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:33 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:18 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">10:21 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">10:46 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">10:53 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:38 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">10:41 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:06 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:13 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">11:58 pm&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="odd"> <td class="small">MLBR</td> <td class="small" align="right">11:01 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:26 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">11:33 pm&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:18 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> <tr class="even"> <td class="small">MLBR</td> <td class="small" align="right">11:26 pm&nbsp;</td> <td bgcolor="#ffff33" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="PITT" border="0"></a> </td> <td class="small">&nbsp;BALB</td> <td class="small" align="right">11:51 pm&nbsp;</td> <td class="small">BALB</td> <td class="small" align="right">12:02 am&nbsp;</td> <td bgcolor="#0099cc" width="6"> <a href="/schedules/schedule_legend" target="_blank" onclick=" return false;"> <img src="/sites/all/themes/bart_desktop/img/spacer.gif" width="6" height="8" alt="DUBL" border="0"></a> </td> <td class="small">&nbsp;CAST</td> <td class="small" align="right">12:47 am&nbsp;</td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> <td class="small"></td> <td class="small" align="right"></td> <td width="6"></td> <td class="small"></td> <td class="small" align="right"></td> </tr> </tbody></table> </div> </td> </tr> </tbody></table><br></td> </tr> </tbody></table> </div> </div> </div> <script src="https://www.bart.gov/sites/default/files/js/js_gPM6NXOQjN2XM2JWQGfy07nKmcdDFrL289YA7h80ySs.js"></script> <script src="https://www.bart.gov/sites/default/files/js/js_H7q2xORKmR9AN8Qx5spKEIBp7R_wG2apAswJoCUZY7I.js"></script> <script src="https://www.bart.gov/sites/default/files/js/js_NpX2cwCeepkWZZ194B6-ViyVBHleaYLOx5R9EWBOMRU.js"></script> <script src="https://www.bart.gov/sites/default/files/js/js_TcAF-Jottcr7AWFVUfNmLgGWMsuCs2tXqTV7NTN_B5c.js"></script> <script src="//www.powr.io/powr.js?powr-token=drupal_5179d6d7f3e0633bcdfdfabd4e01446709522f34&amp;external-type=drupal"></script> <script>window.CKEDITOR_BASEPATH = \'/sites/all/libraries/ckeditor/\'</script> <script src="https://www.bart.gov/sites/default/files/js/js_gPqjYq7fqdMzw8-29XWQIVoDSWTmZCGy9OqaHppNxuQ.js"></script> <script>(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,"script","//www.google-analytics.com/analytics.js","ga");ga("create", "UA-12028058-1", {"cookieDomain":".bart.gov"});ga("set", "anonymizeIp", true);ga("send", "pageview");</script> <script src="https://www.bart.gov/sites/default/files/js/js_lF6CVb8dRY9zqxVJviMC7FiRSXzg0tzGbWPWuIPmrp4.js"></script> <script src="https://www.bart.gov/sites/default/files/js/js_xmNenYyw--iWLHEwx-YAQqi9XL2fUzar-qbpcHuzrFU.js"></script> <script>jQuery.extend(Drupal.settings, {"basePath":"\/","pathPrefix":"","ajaxPageState":{"theme":"bart_desktop","theme_token":"htEC3tGKfUR_QMgCeBdPmKUeP281-QDQ53Bq1_rIJd4","js":{"sites\/all\/modules\/contrib\/jquery_update\/replace\/jquery\/1.10\/jquery.min.js":1,"misc\/jquery.once.js":1,"misc\/drupal.js":1,"sites\/all\/modules\/contrib\/jquery_update\/replace\/ui\/external\/jquery.cookie.js":1,"sites\/all\/modules\/contrib\/extlink\/extlink.js":1,"sites\/all\/modules\/custom\/bart_quickplanner\/js\/Zebra_Datepicker\/public\/javascript\/zebra_datepicker.js":1,"sites\/all\/modules\/features\/bart_promo_views\/js\/bart_promo_views_async.js":1,"\/\/www.powr.io\/powr.js?powr-token=drupal_5179d6d7f3e0633bcdfdfabd4e01446709522f34\u0026external-type=drupal":1,"0":1,"sites\/all\/modules\/contrib\/google_analytics\/googleanalytics.js":1,"1":1,"sites\/all\/themes\/mothership\/mothership\/js\/contextual.js":1,"sites\/all\/themes\/bart_desktop\/js\/functions.js":1},"css":{"modules\/system\/system.base.css":1,"modules\/system\/system.menus.css":1,"modules\/system\/system.messages.css":1,"modules\/system\/system.theme.css":1,"sites\/all\/modules\/contrib\/date\/date_api\/date.css":1,"sites\/all\/modules\/contrib\/date\/date_popup\/themes\/datepicker.1.7.css":1,"modules\/field\/theme\/field.css":1,"sites\/all\/modules\/contrib\/mollom\/mollom.css":1,"modules\/node\/node.css":1,"modules\/user\/user.css":1,"sites\/all\/modules\/contrib\/youtube\/css\/youtube.css":1,"sites\/all\/modules\/contrib\/extlink\/extlink.css":1,"sites\/all\/modules\/contrib\/views\/css\/views.css":1,"sites\/all\/modules\/custom\/bart_quickplanner\/js\/Zebra_Datepicker\/public\/css\/bootstrap.css":1,"sites\/all\/modules\/contrib\/ctools\/css\/ctools.css":1,"modules\/search\/search.css":1,"sites\/all\/modules\/contrib\/nice_menus\/css\/nice_menus.css":1,"sites\/all\/modules\/contrib\/nice_menus\/css\/nice_menus_default.css":1,"sites\/all\/themes\/bart_desktop\/css\/style.css":1}},"urlIsAjaxTrusted":{"\/siteinfo\/search":true},"extlink":{"extTarget":"_blank","extClass":0,"extLabel":"(link is external)","extImgClass":0,"extSubdomains":1,"extExclude":"","extInclude":"","extCssExclude":"","extCssExplicit":"","extAlert":0,"extAlertText":"This link will take you to an external web site.","mailtoClass":0,"mailtoLabel":"(link sends e-mail)"},"googleanalytics":{"trackOutbound":1,"trackMailto":1,"trackDownload":1,"trackDownloadExtensions":"7z|aac|arc|arj|asf|asx|avi|bin|csv|doc(x|m)?|dot(x|m)?|exe|flv|gif|gz|gzip|hqx|jar|jpe?g|js|mp(2|3|4|e?g)|mov(ie)?|msi|msp|pdf|phps|png|ppt(x|m)?|pot(x|m)?|pps(x|m)?|ppam|sld(x|m)?|thmx|qtm?|ra(m|r)?|sea|sit|tar|tgz|torrent|txt|wav|wma|wmv|wpd|xls(x|m|b)?|xlt(x|m)|xlam|xml|z|zip","trackDomainMode":"1"}});</script> </body> </html> ';
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
                }
                if($_children[13].textContent.trim().length){
                    obj.doubleTransfer = true;
                    obj.transfer = true;
                    obj.transferStation = $_children[3].textContent.trim();
                    obj.transferArrive = $_children[4].textContent;
                    obj.transferDepart = $_children[6].textContent;
                    obj.trainTransferDestination = $($_children[2]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[2]).find('img').attr('alt');
                    obj.transfer2Station = $_children[8].textContent.trim();
                    obj.transfer2Arrive = $_children[9].textContent;
                    obj.transfer2Depart = $_children[11].textContent;
                    obj.trainTransfer2Destination = $($_children[7]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[7]).find('img').attr('alt');
                    obj.trainDestination = $($_children[12]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[12]).find('img').attr('alt');
                    obj.arrive = $_children[13].textContent.trim();
                    obj.arriveTime = $_children[14].textContent;
                }else if($_children[8].textContent.trim().length){
                    obj.transfer = true;
                    obj.transferStation = $_children[3].textContent.trim();
                    obj.transferArrive = $_children[4].textContent;
                    obj.transferDepart = $_children[6].textContent;
                    obj.trainTransferDestination = $($_children[2]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[2]).find('img').attr('alt');
                    obj.trainDestination = $($_children[7]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[7]).find('img').attr('alt');
                    obj.arrive = $_children[8].textContent.trim();
                    obj.arriveTime = $_children[9].textContent;
                } else {
                    obj.arrive = $_children[3].textContent.trim();
                    obj.arriveTime = $_children[4].textContent;
                    obj.trainDestination = $($_children[2]).find('img').attr('alt') == "WARM" ? "FRMT" : $($_children[2]).find('img').attr('alt');
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
            if(first && !hasSelected && typeof trips[(key + 1)] != "undefined" && trips[(key)].timeInMinutes > currentTimeInMinutes){
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
            html += '<p class="time-details">'+train.departTime+' - ' + train.transferArrive + '<span class="trainTowards '+train.trainTransfer2Destination+'">'+train.trainTransfer2Destination+' train<span></p>';
            html += '<p><span>'+stations[train.transferStation].name+'</span> to <span>'+stations[train.transfer2Station].name+'</span></p>';
//            html += '<p class="time-details-towards">towards '+stations[train.trainTransfer2Destination].name+'</p>';
//            html += '<p class="time-details" >'+ stations[train.trainTransferDestination].name +'</p>';
//            html += '<p>transfer at <span>'+stations[train.transferStation].name+'</span></p>';
            html += '<p class="time-details">'+train.transferDepart+' - ' + train.transfer2Arrive + '<span class="trainTowards '+train.trainTransferDestination+'">'+train.trainTransferDestination+' train<span>' + '</p>';
            html += '<p><span>'+stations[train.transfer2Station].name+'</span> to <span>'+dest.name+'</span></p>';

//            html += '<p class="time-details" >'+ stations[train.trainDestination].name +'</p>';
            html += '<p class="time-details">'+train.transfer2Depart+' - ' + train.arriveTime + '<span class="trainTowards '+train.trainDestination+'">'+train.trainDestination+' train<span></p>';
        }else if(train.transfer && !train.doubleTransfer){
            var html = '<p><span>'+origin.name+'</span> to <span>'+stations[train.transferStation].name+'</span></p>';
            html += '<p class="time-details">'+train.departTime+' - ' + train.transferArrive + '<span class="trainTowards '+train.trainTransferDestination+'">'+train.trainTransferDestination+' train<span></p>'
            html += '<p><span>'+stations[train.transferStation].name+'</span> to <span>'+dest.name+'</span></p>';
            html += '<p class="time-details">'+train.transferDepart+' - ' + train.arriveTime + '<span class="trainTowards '+train.trainDestination+'">'+train.trainDestination+' train<span></p>'
        } else {
            var html = '<p><span>'+origin.name+'</span> to <span>'+dest.name+'</span></p>';
            html += '<p class="time-details">'+train.departTime+' - ' + train.arriveTime + '<span class="trainTowards '+train.trainDestination+'">'+train.trainDestination+' train<span></p>'
        }

//            html += '<p class="time-details" >'+ stations[train.trainDestination].name +'</p>';

//        }

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

        if($_dateText.length && $_dateText.position().top <= ($('.times-page-content').scrollTop() - (dateHeight))){
            $_dateText.addClass('scrolledNorth')
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
        $('body').on('click', '.shareWithFriends', function(){
            app.shareWithFriends();
        });
        $('body').on('click', '.bartMap-link', function(){
            var html = '<div class="map-container-full"><img src="img/bart_map.png" usemap="#Map" /><map name="Map" id="Map"><area alt="" title="" href="#" shape="rect" coords="1667,101,1687,120" /><area alt="" title="" href="#" shape="rect" coords="1577,162,1591,177" /></map>';
            if($(this).attr('data-origin')){
                var origin = $(this).attr('data-origin');
                var dest = $(this).attr('data-destination');
                html += '<div class="map-marker map-marker-'+origin+'"></div>';
                html += '<div class="map-marker map-marker-'+dest+'"></div>';
            }
            html += '</div>';
            var myPhotoBrowserStandalone = myApp.photoBrowser({
                photos : [
                    {
                        html: html
                    }
                ],
                theme: 'dark',
                toolbar: false,
                onOpen: function(){
                    $('map').imageMapResize()
                    setTimeout(function(){
                       var coords = $('area').first().attr('coords').split(',');
                       var height = $('.map-marker').height();
                       var x = coords[0] - (height / 2);
                       var y = coords[1] - height;
                       $('.map-marker-'+origin).css({left: x, top: y});
                    }, 500)

                }
            })
            myPhotoBrowserStandalone.open();
            myApp.closePanel();
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
            $('.bartSpinner').addClass('hide')
        });

        $('#bartInput').on('change', function(e, data){
            data = data || {};
//            if(timeout){
//                clearTimeout(timeout);
//            }
//            timeout = setTimeout(function(){
                myApp.showIndicator();
                $('.infinite-scroll-preloader').hide();
                myApp.closePanel();
                var s = currentStations = $('#bartInput').val();
                localStorage.setItem('stations', s);
                timesArray.length = 0;
                dateTextArray.length = 0;
                $('.times ul').empty();
                if(!data.dontUpdateDisplayDate){
                    displayDate = new Date();
                    app.setDateString(displayDate, false);
                    var day = displayDate.getDay();
                    if(displayDate == 0){
                        app.setScheduleDropdown('sunday');
                    } else if(displayDate == 6){
                        app.setScheduleDropdown('saturday');
                    } else {
                        app.setScheduleDropdown('weekday');
                    }
                }
                app.getFullTrainTimes(s, schedule, true);
                app.getDelayStatus(true)
//            }, 500)
        });
    }
};
function isScrolledIntoView(elem)
{
    var docViewTop = $(window).scrollTop();
    var elemTop = $(elem).offset().top;
    return elemTop >= (docViewTop + 70);
}