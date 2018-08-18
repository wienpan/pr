var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
// var jade = require('gulp-jade');
// var sass = require('gulp-sass');
// var plumber = require('gulp-plumber');
// var postcss = require('gulp-postcss');
//使用watch指令就不需 var 以上套件,不屬於gulp套件就需載進來
var autoprefixer = require('autoprefixer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence').use(gulp);




// 假設開發環境則壓縮
var envOptions = {
  string: 'env',
  default: {
    env: 'develop'
  }
};
var options = minimist(process.argv.slice(2), envOptions);
console.log(options);

//// clean
gulp.task('clean', function () {
  return gulp.src(['./.tmp', './public'], {
      read: false
    })//選項讀取：false阻止gulp讀取文件的內容，使此任務更快。
    .pipe($.clean());
});

//jade
gulp.task('jade', function () {
  gulp.src(['./source/*.jade', './source/partials/*.jade'])
    .pipe($.plumber())
    .pipe($.data(function (file) {
      var KhData = require('./source/data/data.json');
      var menus = require('./source/data/menu.json');
      var source = {
        'KhData': KhData,
        'menus': menus
      };
      return source;
    }))
    .pipe($.jade({
      pretty: true
      //pretty: true可以不壓縮檔案
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(browserSync.stream());
});

//scss
gulp.task('sass', function () {
  var plugins = [
    autoprefixer({
      browsers: ['last 3 version', '> 5%', 'ie 8']
    })
  ];
  return gulp.src('./source/stylesheets/**/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass({ 
      outputStyle: 'nested',
      includePaths: ['./node_modules/bootstrap/scss']
    })//includePaths將外部的sass當作函示庫的方式載入
    .on('error', $.sass.logError))
    //編譯完成 css
    .pipe($.postcss(plugins))
    .pipe($.if(options.env === 'production', $.cleanCss())) // 假設開發環境則壓縮 CSS
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream());
});

//babel cleanCss
gulp.task('babel', function() {
  gulp.src('./source/js/**/*.js')
    .pipe($.sourcemaps.init())
    .pipe($.babel({
      presets: ['env']
    }))
    //$.concat可以讓多個js檔案合併
    .pipe($.concat('all.js'))
    .pipe($.if(options.env === 'production', $.uglify({
      compress: {
        drop_console: true
      }
    })))
    .pipe($.sourcemaps.write('.'))
    .pipe($.jshint())
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

//bower
gulp.task('bower', function () {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('./.tmp/vendors'));
  cb(err);
});

//處理外部載入的js檔案
gulp.task('vendorJs', ['bower'], function () {
  return gulp.src([
    './.tmp/vendors/**/**.js',
    './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'
  ])
    .pipe($.order([
    'jquery.js'
  ]))
    .pipe($.concat('vendors.js'))
    .pipe($.if(options.env === 'production', $.uglify()))
    .pipe(gulp.dest('./public/js'));
});

//browser-sync Static server
gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: "./public",
      reloadDebounce: 2000
    }
  });
});

//imagemin圖片壓縮
gulp.task('image-min', function () {
  gulp.src('./source/images/*')
    .pipe($.if(options.env === 'production', $.imagemin()))
    .pipe(gulp.dest('./public/images'));
});

//ghPages檔案快速上傳gihub
gulp.task('deploy', function () {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});


//watch可以持續監控編譯,無須重複在命令列下指令
gulp.task('watch', function () {
  gulp.watch('./source/scss/**/*.scss', ['sass']);
  gulp.watch('./source/*.jade', ['jade']);
  gulp.watch('./source/js/**/*.js', ['babel']);
});

//sequence開發流程不須加入browser-sync, watch
gulp.task('build', gulpSequence('clean', 'jade', 'sass', 'babel', 'vendorJs', 'image-min'));

//在命令列只需下 gulp 指令不須再下jade', 'sass', 'watch
gulp.task('default', ['jade', 'sass', 'babel', 'vendorJs', 'browser-sync', 'image-min', 'watch']);

