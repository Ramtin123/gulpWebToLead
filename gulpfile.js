var gulp=require('gulp');
var inject=require('gulp-inject');
var htmlparser = require("htmlparser2");
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var uglify = require('gulp-uglify');
var uglifycss = require('gulp-uglifycss');
var rename = require("gulp-rename");
var clean = require('gulp-clean');
var es = require('event-stream');
var webserver=require('gulp-webserver');



function Tag(tagname,attribs,nestedValue){
    this.TagName=tagname;
    this.Attribs= attribs || {};
    this.NestedItems=(nestedValue?[nestedValue]: []);
}

Tag.prototype={
    AddAttribute:function(name,value){
        this.Attribs[name]=value;
        return this;
    },
    AddNestedItem:function(item){
        this.NestedItems.push(item);
        return this;
    },   
    GetHtml:function(){
        var result='';
        if(this.TagName){
             result='<'+this.TagName;
             for (var prop in this.Attribs) {
                result+=" "+ prop + '="' + this.Attribs[prop]+'"';
             }
             result+='>'+'\r\n';
        }
        
        this.NestedItems.forEach(function(element) {
            if(element.TagName)
               result+=element.GetHtml()+'\r\n';
            else
                result+=element+'\r\n';
        }, this);
        
        if(this.TagName){
            result+='</'+this.TagName+'>';
        }
        
        return result;
    }
}

function Transformer(){
   this.Form=null;
   this.label="";
}


Transformer.prototype={
    RegisterText:function(text){
        this.label=text;
    },
    RegisterTag:function(tagname,attribs){
       switch(tagname) {
          case 'form':
             this.Form=new Tag('div');
             break;
          case 'label':
            this.label="";
            break;
          case 'input':
            if(attribs.hasOwnProperty('type')){
                if(attribs['type']==='text'){
                    this.Form.AddNestedItem('<div class="col-sm-12 form-group">');
                    this.Form.AddNestedItem('<span class="col-sm-1 text-info"><strong>'+this.label+' :</strong></span>');
                    this.Form.AddNestedItem('<div class="col-sm-3">');
                    this.Form.AddNestedItem(new Tag('input',{
                        class:"form-control",
                        id:attribs['id'],
                        name:attribs['name'],
                        type:"text",
                        placeholder:this.label,
                        "ng-model":"Lead."+ attribs['name'],
                        "ng-required":true,
                        "ng-maxlength":attribs['maxlength']
                    }));
                    this.Form.AddNestedItem('</div>');
                    this.Form.AddNestedItem('&nbsp;&nbsp;');
                    this.Form.AddNestedItem(new Tag('span',{
                        class:"alert-danger",
                        "ng-if":"form.$submitted && form."+attribs['name']+".$error.required" ,
                    },this.label+' is required'));
                    this.Form.AddNestedItem(new Tag('span',{
                        class:"alert-danger",
                        "ng-if":"form."+attribs['name']+".$error.maxlength" ,
                    },this.label+' is too long'));
                    this.Form.AddNestedItem('</div>');
                }
                  
            }
            break;
       }
   },
    GetHtml:function(){
       return this.Form.GetHtml(); 
   }
}


function GulpFactory(env){
    
    function GulpFactoryConstructor(){
        this.Env=env;
        this.Path='./dest/dev/';
        if('prod'===env) {
           this.Path='./dest/prod/';
        }
        this.ScriptsPath= this.Path+'scripts/';
        this.CssPath=this.Path+'styles/';
        this.ImagesPath=this.Path+'Images/';
    }
    
    GulpFactoryConstructor.prototype._getScripts=function(){
       return gulp.src(['./src/scripts/Libraries/jquery*.js','src/scripts/Libraries/*.js','src/scripts/app/*.js']);
    }

    GulpFactoryConstructor.prototype._getCss=function(){
        return gulp.src('./src/styles/*.css');
    }

    GulpFactoryConstructor.prototype._getAssets=function(){
            return es.concat(gulp.src('./src/Images/*').pipe(gulp.dest('./dest/Images')),
                gulp.src('./src/web.config').pipe(gulp.dest('./dest')));
    };

    GulpFactoryConstructor.prototype._buildHtml=function(){
        var transformer=new Transformer();
        var done=false;
        var tags=[];
        return gulp.src('./src/index.html')
    .pipe(inject(gulp.src(['./src/partials/*.html']), {
        starttag: '<!-- inject:head:{{ext}} -->',
        transform: function (filePath, file) {
        var parser = new htmlparser.Parser({
        onopentag: function(name, attribs){
            var pattern = /^([^0-9]*)$/;
            if(pattern.test(attribs['name'])){
                    transformer.RegisterTag(name,attribs);
                    
            }
            },
            ontext:function(name){
                transformer.RegisterText(name);
            },
            onclosetag:function(name){
                if(name==='form')  done=true;
            }
            }, {decodeEntities: true});
        parser.write(file.contents.toString('utf8'));
        while(!done){
            continue;
        }
        
        return transformer.GetHtml();
        }
    }));
    }
    
    GulpFactoryConstructor.prototype._copy=function(){
        var self=this;
        return function(cb){
            var streams=[];
            if('prod'===self.Env){
                streams.push(self._getScripts().pipe(concat('scripts.js')).pipe(rename('scripts.min.js')).pipe(gulp.dest(self.ScriptsPath)));
                streams.push(self._getCss().pipe(concatCss('styles.css')).pipe(uglifycss()).pipe(rename('styles.min.css')).pipe(gulp.dest(self.CssPath)));
                
            }
            else{
                streams.push(self._getScripts().pipe(gulp.dest(self.ScriptsPath)));
                streams.push(self._getCss().pipe(gulp.dest(self.CssPath)));
            }
            streams.push(gulp.src('./src/Images/*').pipe(gulp.dest(self.ImagesPath)));
            streams.push(gulp.src('./src/web.config').pipe(gulp.dest(self.Path)));
            es.concat.apply(self,streams).on('end',function(){
                cb(); 
            });
        }  
   }
   
   GulpFactoryConstructor.prototype._clean=function(){
       var self=this;
        return function(){
            return gulp.src(self.Path).pipe(clean({force: true})); 
        }  
   }
   
   GulpFactoryConstructor.prototype._serv=function(){
       var self=this;
       return function(){
           return  gulp.src(self.Path).pipe(webserver());
       }
   }
   
   GulpFactoryConstructor.prototype._inject=function(){
       var self=this;
       return function(){
           gulp.src(self.ScriptsPath).
           
       }
   }
   
   var gulpObj=new GulpFactoryConstructor();
    
    return {
        Clean:gulpObj._clean(),
        Copy:gulpObj._copy(),
        Serv:gulpObj._serv(),
        Inject:gulpObj._inject()
    }
}


gulp.task('default',['copy:prod'],function(){
    
});

gulp.task('clean:dev',GulpFactory('dev').Clean);

gulp.task('clean:prod',GulpFactory('prod').Clean);

gulp.task('copy:dev',GulpFactory('dev').Copy);

gulp.task('copy:prod',GulpFactory('prod').Copy);

gulp.task('serv:dev',GulpFactory('dev').Serv);

gulp.task('serv:prod',GulpFactory('prod').Serv);

gulp.task('inject:dev',GulpFactory('dev').Inject);

gulp.task('inject:prod',GulpFactory('prod').Inject);

gulp.task('watch',function(){
    
});

gulp.task('build:dev',function(){
   // Helpers.BuildHtml().
});

gulp.task('build:prod',function(){
    
});

// 
// gulp.task('copy:assets',function(cb){
//     es.concat(gulp.src('./src/Images/*').pipe(gulp.dest('./dest/Images')),
//               gulp.src('./src/web.config').pipe(gulp.dest('./dest'))
//     ).on('end',cb);
// });
// 
// 
// gulp.task('clean:assets',function(){
//     return gulp.src('dest').pipe(clean({force: true})); 
// });
// 
// gulp.task('concat:assets',function(cb){
//    var stream1= getScriptsStream().pipe(concat('scripts.js')).pipe(uglify()).pipe(gulp.dest('dest/scripts'));
//    var stream2=gulp.src(['./src/styles/*.css']).pipe(concatCss('styles.css')).pipe(uglifycss()).pipe(rename('styles.min.css')).pipe(gulp.dest('dest/styles'));
//    es.concat(stream1,stream2).on('end',cb);
// });
// 
// gulp.task('ugly:assets',function(cb){
//     var stream1= gulp.src(['./dest/scripts']).pipe(concat('scripts.js')).pipe(uglify()).pipe(rename('scripts.min.js')).pipe(gulp.dest('dest/scripts'));
//    var stream2=gulp.src(['./src/styles/*.css']).pipe(concatCss('styles.css')).pipe(uglifycss()).pipe(rename('styles.min.css')).pipe(gulp.dest('dest/styles'));
//    es.concat(stream1,stream2).on('end',cb);
// });
// 





