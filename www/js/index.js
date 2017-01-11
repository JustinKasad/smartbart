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

        mobiscroll.scroller('#bartInput', {
            theme: 'mobiscroll-dark',
            display: 'inline',
             showLabel: true,
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



        $('#bartInput').on('change', function(){
            app.fetchTrainTimes($(this).val());
        })


    },

    fetchTrainTimes: function(times){
        var stations = times.split(' ');
        if(stations[0] == stations[1]){
            return;
        }
        var url = "http://api.bart.gov/api/sched.aspx?cmd=depart&b=4&a=4&orig="+stations[0]+"&dest="+stations[1]+"&key=MW9S-E7SL-26DU-VV8V"
        $.ajax({
                 type: "GET",
                 url: url,
                 dataType: "xml",
                 async: false,
                 contentType: "text/xml; charset=\"utf-8\"",
                 complete: function(xml) {
                    var result = xmlToJSON.parseString(xml.responseText);
                    app.displayTimes(result.root["0"].schedule["0"].request["0"].trip);
                 }
            });

    },
    displayTimes: function(trips){
        console.log(trips);
        $('.times').empty()
        $.each(trips, function(key, val){
            $('.times').append('<p>' + val._attr.origTimeMin._value + ' - ' + val._attr.destTimeMin._value + '</p>')
        })
    }
};
