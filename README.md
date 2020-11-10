This extension adds the necessary JavaScript to run the Adobe Launch web analytics package on your wiki.

If you want to install this extension in your wiki.

	cd extensions
	git clone https://www.github.com/freephile/AdobeLaunch.git
	add "wfLoadExtension( 'AdobeLaunch' );" to your LocalSettings.php file

This extension includes the recommended code checkers for PHP and JavaScript code in Wikimedia projects
(see https://www.mediawiki.org/wiki/Continuous_integration/Entry_points).
To take advantage of this automation.

1. install nodejs, npm, and PHP composer
2. change to the extension's directory
3. `npm install`
4. `composer install`

Once set up, running `npm test` and `composer test` will run automated code checks.
