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

} );
