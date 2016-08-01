/**
 * Created by Elad on 12/07/2016.
 */

var Sh = {};
Sh.allBranches = new Map();
Sh.allMarkers = new Map();
Sh.stores = [];
Sh.markers = [];
Sh.managers = [];
Sh.map = "";
Sh.defualtCenter = new google.maps.LatLng(32.1250386, 34.7984045);
Sh.defualtZoom = 15;
Sh.lastCenter = Sh.defualtCenter;
Sh.lastZoom = Sh.defualtZoom;
Sh.waze = "waze://?ll=";
Sh.draggable = false;
Sh.dataVersion = (localStorage.getItem("version")) ? localStorage.getItem("version") : 0;

class Branch {
    constructor(id, name, manager, managerPhone, address, city, format, lat, lon) {
        this.bId = id;
        this.bName = name;
        this.bManager = manager;
        this.bManagerPhone = managerPhone;
        this.bAddress = address;
        this.bCity = city;
        this.bFormat = format;
        this.bLat = lat;
        this.bLon = lon;
        Sh.allBranches.set(this.bId, this);
        this.toMarker();
    }

    toStirng() {
        return "מספר הסניף: " + this.bId + "שם הסניף: " + this.bName;
    }

    toMarker() {
        var location = new google.maps.LatLng(this.bLat, this.bLon); //get branch location
        var marker = new google.maps.Marker({
            position: location,
            title: this.bName,
            //animation: google.maps.Animation.DROP,
            lable: this.bName,
            icon: Sh.getIconUrl(this.bFormat),
            markerIndex: this.bId, //var to identify marker
            draggable: Sh.draggable
        });
        marker.addListener('click', function () {
            Sh.displayBranchPopup(this.markerIndex); // pop up on marker click
        });
        marker.addListener('dragend', function () { //update position when marker dragend
            var branch = Sh.allBranches.get(this.markerIndex);
            branch.bLat = this.getPosition().lat();
            branch.bLon = this.getPosition().lng();
            Sh.allBranches.set(this.markerIndex, branch);
            var array = [];
            Sh.allBranches.forEach(item=>array.push(item));
            localStorage.setItem("stores", JSON.stringify(array)); // convert to json and put in local storage
        });
        Sh.allMarkers.set(this.bId, marker); // put marker in all markers map
        //Sh.markers.push(marker); // put marker in all markers array
    } //get marker for branch
    toPopup() {
        $("#sNum").html(this.bId); //popup header
        $("#sName").html(this.bName); // branch name
        $("#sAddress").html(this.bAddress); // branch address
        $("#sManager").html(this.bManager); // branch manager
        $("#sMangerPhone").html(this.bManagerPhone); // manager phone
        $("#sCallPhone").attr("href", "tel:" + this.bManagerPhone); // link to call manager
        var branchNum = (this.bId < 10) ? "00" + this.bId : (this.bId < 100) ? "0" + this.bId : this.bId;
        //console.log("branchNum: " + branchNum);
        var mail = "snif" + branchNum + "m" + "@stores.co.il"; //string for mail address of manager
        $("#sSendMail").attr("href", "mailto:" + mail); // link to mail manager
        var id = this.bId;
        $("#bShowOnMap").click(function () { //event when user clicked on map button
            Sh.setMapCenter(id);
        });
        $("#bToWaze").attr("href", Sh.waze + this.bLat + "," + this.bLon + "&navigate=yes"); //put link to waze
        $("#branchPopup").popup("open"); //display popup
    } // build and display popup with branch details
}

Sh.getBranchesFromJson = function () {
    $("#bSpinner").show();
    $.ajax({
        url: "stores.json",
        dataType: "json",
        success: function (respons) {
            $("#errormsg").hide();
            var stores = [];
            if (respons.version != Sh.dataVersion) {
                Sh.dataVersion = respons.version;
                localStorage.setItem("version", Sh.dataVersion);
                stores = respons.stores;
                localStorage.setItem("stores", JSON.stringify(stores));
                console.log("Get data from server")
            } else {
                stores = JSON.parse(localStorage.getItem("stores"));
                console.log("Get data from localstorage")
            }
            stores.forEach(function (item) {
                new Branch(item.bId, item.bName, item.bManager, item.bManagerPhone,
                    item.bAddress, item.bCity, item.bFormat, item.bLat, item.bLon);
            });
            //console.log(Sh.allBranches.get(3).toStirng());
            //Sh.stores = respons;
            Sh.addBranchesToListView(); // build list of all stores data in search list view
            //Sh.addManagersToListView();// build list of all managers data in search list view
            //Sh.putMarkersInArray(); //build markers and put them in array
            Sh.getMap(Sh.defualtCenter, Sh.defualtZoom); // display map
            Sh.addBranchesToMap(); // add markers to DOM
            //$.mobile.loading("hide");

        },
        error: function (jqXHR, textStatus, errorThrown) {
            Sh.onError(errorThrown);
        }
    })
}; //get all data from json

Sh.onError = function (errorThrown) {
    console.log("error: " + errorThrown);
    $("#tabs").tabs("disable", 1);
    $("#mMap").html("<br><br><br>Cant get Data.<br>Check your internet connection and try again");
    $("#bSpinner").hide();
};//display error massage

Sh.addBranchesToListView = function () {
    Sh.allBranches.forEach(function (item) {
        var title = "<span style='font-size: 0.9em; font-weight: 600'>" + item.bId + " </span><span style='font-size: 0.9em; font-weight: 500'>" + item.bName + ", " + item.bCity + "</span>"; //build title for li
        var button = document.createElement("a"); // new button
        var id = item.bId;
        $(button).click(function () { // event click for button = > show popup with branch details
            Sh.displayBranchPopup(id);
        }).html(title).addClass("ui-btn ui-btn-inline").css("direction", "rtl").css("text-align", "right"); //add title to button and css
        var li = document.createElement("li"); // new li
        $(li).html(button); //append button to li
        $("#searchListView").append(li); // append li to list view
    });
    $("#searchListView").listview("refresh"); // refresh list view to see changes
}; // build list of all stores data in search list view

Sh.getMap = function (center, zoom) {
    $("#bSpinner").show();
    var mapOptions = {
        center: center, //new google.maps.LatLng(32.3, 35),
        zoom: zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    Sh.map = new google.maps.Map(document.getElementById("mMap"), mapOptions);
    Sh.map.addListener('idle', function () {
        $("#bSpinner").hide();
    });
    /*Sh.map.addListener('center_changed', function () {
     Sh.lastCenter = Sh.map.getCenter(); //log center
     Sh.lastZoom = Sh.map.getZoom(); //log zoom
     });*/
    /*navigator.geolocation.getCurrentPosition(function (position) {
     pos = {
     lat: position.coords.latitude,
     lng: position.coords.longitude
     };
     Sh.map.setCenter(pos)
     }, function () {
     handleLocationError(true, infoWindow, map.getCenter());
     });*/
}; //initialize map, get center and zoom

Sh.getIconUrl = function (sFormat) {
    switch (sFormat) {
        case 1:
            return "";
            break;
        case 2:
            return "";
            break;
        case 3:
            return "";
            break;
        case 4:
            return "";
            break;
        case 5:
            return "";
            break;
        case 6:
            return "";
            break;
        case 7:
            return "src/pinDefault.png";
            break;
        default:
            return "src/pinDefault.png";
            break;
    }
}; //return src img for marker icon base on format

Sh.putMarkersInArray = function () {
    for (var i = 0; i < Sh.stores.length; i++) {
        var location = new google.maps.LatLng(Sh.stores[i].sLat, Sh.stores[i].sLon); //get branch location
        var marker = new google.maps.Marker({
            position: location,
            title: Sh.stores[i].sName,
            //animation: google.maps.Animation.DROP,
            lable: Sh.stores[i].sName,
            icon: Sh.getIconUrl(Sh.stores[i].sFormat),
            markerIndex: i, //var to identify marker
            draggable: Sh.draggable
        });
        marker.addListener('click', function () {
            Sh.displayBranchPopup(this.markerIndex); // pop up on marker click
        });
        marker.addListener('dragend', function () { //update position when marker dragend
            Sh.stores[this.markerIndex].sLat = this.getPosition().lat();
            Sh.stores[this.markerIndex].sLon = this.getPosition().lng();
            localStorage.setItem("stores", JSON.stringify(Sh.stores)); // convert to json and put in local storage
        });
        Sh.markers.push(marker); // put marker in all markers array
    }
}; //iterate all stores and build markers

Sh.addBranchesToMap = function () {
    Sh.allMarkers.forEach(function (marker) {
        marker.setMap(Sh.map);
    });
}; //display all stores on map

Sh.displayBranchPopup = function (id) {
    var branch = Sh.allBranches.get(id);
    branch.toPopup();
}; // build and display popup with branch details

Sh.setMapCenter = function (id) {
    $("#tabs").tabs("option", "active", 0); // go to map tab
    $("#branchPopup").popup("close"); //close popup
    $("#bNavBarSearchBtn").removeClass("ui-btn-active"); // display not active to serach tab
    $("#bNavBarMapBtn").addClass("ui-btn-active"); // display active to map tab
    var branch = Sh.allBranches.get(id);
    var location = new google.maps.LatLng(branch.bLat, branch.bLon);
    Sh.getMap(location, 16); //refresh map
    Sh.addBranchesToMap(); //put markers on map
    //Sh.map.setCenter(location);
    //Sh.map.setZoom(16);
    //$("#pMap").css("width", "100%");
}; //put branch in center of map

Sh.refresh = function () {
    if (Sh.map == "" || Sh.allBranches.size == 0 || Sh.allMarkers.size == 0) {//if not all data exist then get it again
        Sh.getBranchesFromJson();
    } else { // if all data exist then log center and zoom and refresh map
        Sh.lastCenter = Sh.map.getCenter(); //log current center
        Sh.lastZoom = Sh.map.getZoom(); // log current zoom
        Sh.getMap(Sh.lastCenter, Sh.lastZoom); // refresh map  with the logged center and zoom
        Sh.addBranchesToMap(); //display markers on map
    }
}; // when user clicked on refresh button

Sh.saveToLocalstorage = function () {
    localStorage.setItem("stores", JSON.stringify(Sh.stores));
};

$(document).on("pageshow", function () { //on page show
    Sh.getBranchesFromJson(); //get data from json
    $("#tabs").on("tabsactivate", function (event, ui) { //events for tab switch
        switch (ui.newTab.index()) {
            case 0: // if map tab
                $("#bRefresh").show();
                Sh.getMap(Sh.lastCenter, Sh.lastZoom);
                Sh.addBranchesToMap();
                $("#bNavBarSearchBtn").removeClass("ui-btn-active"); // display not active to search tab
                $("#bNavBarMapBtn").addClass("ui-btn-active"); // display active to map tab
                break;
            case 1: // if search tab
                Sh.lastCenter = Sh.map.getCenter(); //log center
                Sh.lastZoom = Sh.map.getZoom(); //log zoom
                $("#bRefresh").hide();
                $("#bNavBarSearchBtn").addClass("ui-btn-active"); // display active to search tab
                $("#bNavBarMapBtn").removeClass("ui-btn-active"); // display not active to map tab
                $("#autocomplete-input").focus();
                break;
        }
    });
    $("#searchListView").filterable({
        beforefilter: function (event, ui) {
            $("#bSpinner").show();
        },
        filter: function (event, ui) {
            $("#bSpinner").hide();
        }
    });

}); //function to call when page ready


