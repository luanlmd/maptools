var map;
var polygons = [];
var markers = [];
var images = [];
var waypoints = [];
//var images = [];
var filesDb = [];

function containsLocation()
{
	//console.log(polygon);
	polygon = polygons[0];
	names = [];
	for (var i = 0; i < markers.length; i++)
	{
		marker = markers[i];
		if (google.maps.geometry.poly.containsLocation(marker.getPosition(), polygon))
		{
			names.push(marker.getTitle());
			marker.setIcon('photo_selected.png');
		}
		else { marker.setIcon('photo.png'); }
	}
	document.getElementById('names').innerHTML = names.join('\n');
}

function parseCoord(coord)
{
	if (coord[1] === 0 && coord[2] === 0) { return coord[0]; }
	return coord[0]+(((coord[1]*60)+(coord[2]))/3600);
}

function readGPX(gpx)
{
	var reader = new FileReader();

	reader.onload = (function(gpx) {
		return function(e) {
			xml = ( new window.DOMParser() ).parseFromString(e.target.result, "text/xml");
			wpts = xml.getElementsByTagName('gpx')[0].getElementsByTagName('wpt');
			for (j = 0; j < wpts.length; j++)
			{
				name = wpts[j].getElementsByTagName('name')[0].innerHTML;
				lat = wpts[j].getAttribute('lat');
				lon = wpts[j].getAttribute('lon');
				ele = wpts[j].getElementsByTagName('ele')[0].innerHTML;
				
				waypoint = {name:name, lat:lat, lon:lon, ele:ele};
				waypoints.push(waypoint);
				
				latLng = new google.maps.LatLng(waypoint.lat,waypoint.lon);
				marker = new google.maps.Marker({
					position: latLng,
					map: map,
					title: waypoint.name + ' (' + ele + 'm)',
					icon: 'marker.png'
				});
			}
		};
	})(gpx);
	
	reader.readAsBinaryString(gpx);
}

function readImage(image)
{
	setTimeout(function() { // async process
		EXIF.getData(image, function() {

			//console.log(image);
			//console.log(EXIF.pretty(this));

			if(EXIF.getTag(image, 'GPSLatitude'))
			{
				images.push(image);
				latitude = parseCoord(EXIF.getTag(image, 'GPSLatitude'));
				if (EXIF.getTag(image, 'GPSLatitudeRef') == 'S') { latitude *= -1; }

				longitude = parseCoord(EXIF.getTag(image, 'GPSLongitude'));
				if (EXIF.getTag(image, 'GPSLongitudeRef') == 'W') { longitude *= -1; }

				latLng = new google.maps.LatLng(latitude,longitude);

				marker = new google.maps.Marker({
					position: latLng,
					map: map,
					title: image.name,
					icon: 'photo.png'
				});

				google.maps.event.addListener(marker, 'click', function() {
					for (i = 0; i < markers.length; i++)
					{
						if (markers[i] == this)
						{
							console.log('assôooo!');
							console.log(i);

							f = images[i];

							var reader = new FileReader();
							reader.onload = (function(theFile) {
								return function(e) {
									var img = document.createElement('img');

									img.src =  e.target.result;
									img.width = 1200;
									img.addEventListener('click', function(){
										document.getElementById('overlay').style.display = 'none';
									});

									overlay = document.getElementById('overlay');
									overlay.innerHTML = '';
									overlay.appendChild(img);
									overlay.style.display = 'block';
								};
							})(f);

							reader.readAsDataURL(f);
						}
					}
				});

				markers.push(marker);
				map.setCenter({ lat:latitude, lng:longitude });
			}
		});


	}, 0);
}

function readFiles(files)
{
	for (var i = 0; i < files.length; i++)
	{
		file = files[i];
		if (file.type == "image/jpeg")	{ readImage(file); filesDb.push(file); }
		else if (file.name.split('.').pop() == 'gpx') { readGPX(file); }
		else { console.log('not an useful file'); }
	}
	return false;
}

function download()
{
	alert('aqui');
}

window.onload = function() {
	/* map */
	var mapOptions = {
		zoom: 8,
		center: new google.maps.LatLng(-9.4481212,-48.0323004,7),
		mapTypeId: google.maps.MapTypeId.SATELLITE
	};

	var mapElement = document.getElementById('map');
	map = new google.maps.Map(mapElement, mapOptions);

	/* drawing tools */
	var drawingManager = new google.maps.drawing.DrawingManager({
		drawingControl: true,
		drawingControlOptions: {
			position: google.maps.ControlPosition.TOP_CENTER,
			drawingModes: [
				google.maps.drawing.OverlayType.POLYGON,
			]
		},
		polygonOptions: {
			fillColor: '#00ff00',
			fillOpacity: 0.1,
			strokeWeight: 2,
			editable: true,
			draggable:true
		}
	});
	drawingManager.setMap(map);

	google.maps.event.addListener(drawingManager,'polygoncomplete',function(polygon) {
		drawingManager.setMap(null);
		polygons.push(polygon);
		containsLocation();		
	});

	body = document.getElementsByTagName('body')[0];
	body.ondragover = function () { return false; };
	body.ondragend = function () { return false; };
	body.ondrop = function (e) {
		e.preventDefault();
		readFiles(e.dataTransfer.files);
	};

	var fileInput = document.getElementById('fileInput');
	fileInput.onchange = function (e) {
		e.preventDefault();
		readFiles(e.target.files);
	};
};