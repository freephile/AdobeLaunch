( function () {

	/**
	 * @class mw.adobeLaunch
	 * @singleton
	 */
	mw.adobeLaunch = {
	};

	console.log( "ready! Recording Page View\n" );
	window._satellite.track('page_view',{
		'site_id': 'FamilySearch',
		'site_language': mw.config.get('wgContentLanguage'), // 'en'
		'page_channel': 'Wiki',
		'page_detail': document.location.pathname //'Home' for the homepage or a unique page title for other pages
	});

}() );
