const gulp = require('gulp')
const webserver = require('gulp-webserver')


gulp.task('web-server', function (done) {
    gulp.src('.')
        .pipe(webserver({
            livereload: false,
            directoryListing: true,
            open: 'www/index.html'
        }));
});

gulp.task('watch', (done) => {
	let reload = (done) => {
		done();
	};

	gulp.watch('www/**/*',
		gulp.series(
			reload
		)
	);
});

gulp.task('default',
    gulp.parallel(
        'web-server',
		'watch'
    )
);
