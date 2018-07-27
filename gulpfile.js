let gulp = require('gulp');
let browserSync = require('browser-sync').create();
let critical = require('critical');

gulp.task('default', function() {
	browserSync.init({
		server: {
            baseDir: './'
        }
	});
});

gulp.task('critical', function() {
	return new Promise((resolve, reject) => {
		critical.generate({
		    inline: true,
		    base: './',
		    src: 'restaurant-not-critical.html',
		    dest: './restaurant.html',
			minify: true
		});
		critical.generate({
		    inline: true,
		    base: './',
		    src: 'index-not-critical.html',
		    dest: './index.html',
			minify: true
		});
		resolve();
	});
});
