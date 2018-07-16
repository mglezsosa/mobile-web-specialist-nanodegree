let gulp = require('gulp');
let browserSync = require('browser-sync').create();

gulp.task('default', function() {
	browserSync.init({
		server: {
            baseDir: './'
        }
	});
});
