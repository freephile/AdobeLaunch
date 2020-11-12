/** This didn't work to load a script element
(function(a,b,c,d){
    a='//assets.adobedtm.com/05064fe6cab0/c247cd0acad1/launch-7e623b6eec86.min.js';
    b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;
    a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
})();
*/



//  Immediately Invoked Function Expression (IIFE) or Self Executing Anonymous Function.
( function () {

	/**
	 * @class mw.adobeLaunch
	 * @singleton
	 * we do nothing with the object oriented interface
	 */
	mw.adobeLaunch = {
	};

	// The page details we want to track
	var config = {
		'site_id': 'FamilySearch',
		'site_language': mw.config.get('wgContentLanguage'), // 'en'
		'page_channel': 'Wiki',
		'page_detail': document.location.pathname //'Home' for the homepage or a unique page title for other pages
	};

	// establish that we're doing something
	console.log( "ready! Recording Page View\n" );

	window._satellite = window._satellite || {};

	
	
	// attach the _satellite object to the global window explicitly
	window._satellite.track('page_view', config);

} )();
