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

    fetchTrainTimes: function(times){
        var s = times.split(' ');
        if(s[0] == s[1]){
            return;
        }
        var url = "http://api.bart.gov/api/sched.aspx?cmd=depart&b=4&a=4&orig="+s[0]+"&dest="+s[1]+"&key=MW9S-E7SL-26DU-VV8V"
        $.ajax({
                 type: "GET",
                 url: url,
                 dataType: "xml",
                 async: false,
                 contentType: "text/xml; charset=\"utf-8\"",
                 complete: function(xml) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    timesArray = result.root["0"].schedule["0"].request["0"].trip;
                    app.displayTimes(timesArray);
                 }
            });

    },
    displayTimes: function(trips){
        $('.times ul').empty()
        var i = 0;
        $.each(trips, function(key, val){
            var html = '<li><a data-panel="right" href="#" class="open-panel item-content item-link time" data-index='+i+'><div class="item-inner"><div class="item-title">' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</div><div class="item-after">'+val._attr.tripTime._value+'m';
            i++;

            if(val.leg.length > 1){
                html += '<span class="exclamation">!</span>';
            }
            html += '</div></div></a></li>';
            $('.times ul').append(html)
        })
    },
    displayTrainData: function(i){

    },
    setEvents: function(){
        $('body').on('click', '.time', function(){
            var index = $(this).attr('data-index');
            console.log(JSON.stringify(timesArray[index]));
        })
        $('#bartInput').on('change', function(){
            var s = $(this).val();
            localStorage.setItem('stations', s);
            app.fetchTrainTimes(s);
        })

    }
};
