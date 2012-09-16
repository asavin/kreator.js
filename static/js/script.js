define(['text', 'jquery', 'htmlEntites', 'buttonHandler', 'slide-template', 'settings', 'canvas'], function(textStyle, $, htmlEntites, bHandler, slideTemplate, settings, canvas){

	var Kreator = (function (options) {
		var slideX = 0, // to keep track of the current slide we're on
			slideY = 0, // to keep track of the current slide we're on
			$ = options.jquery,
			Reveal = options.reveal,
			$span,
			hljs = options.hljs;

		var init = function() {

			options.right = $('<div data-direction="right">+</div>')
					.addClass('add-slide add-right')
					.on('click', function(){
						Kreator.addSlideRight();
						Reveal.navigateRight();
					});
			
			options.down = $('<div data-direction="bottom">+</div>')
					.addClass('add-slide add-down')
					.on('click', function(){
						Kreator.addSlideDown();
						Reveal.navigateDown();
					});
			
			var uioptions = settings.get();
			if(uioptions && uioptions.hasOwnProperty('body')) {
				$('body').css('background', uioptions.body[0].split(':')[1]);
			}

			$('body').append(options.right).append(options.down);

			$('section').on('click', addContentToSlide);

			$('#download').on('click', function(){
				var s = $('.slides>section');
				var slides = {};
				
				s.each(function(idx, slide){
					slide = $(slide);
					if($('section', slide).length) {
						slides['slide'+idx] = [];
						$('section', slide).each(function(i, sl){
							sl = $(sl);
							content = sl.html();
							content = htmlEntites.convertTags(content);
							slides['slide'+idx].push(content);
						});
					} else {
						content = slide.html();
						content = htmlEntites.convertTags(content);
						slides['slide'+idx] = '<section>' + content + '</section>';
					}
				});
		
				var html = document.querySelector('html'),
					theme;
				if(html.classList.length) {
					theme = html.classList[0];
					if(theme.length>12) {
						theme = null;
					}
				} else {
					theme = null;
				}

				var webfonts = '';
				var fonts = settings.get('webfont');
				if(Array.isArray(fonts)) webfonts = fonts.map(function (font) {
					return "<link href='http://fonts.googleapis.com/css?family="+font+"' rel='stylesheet' type='text/css'>"
				}).join('');
					else webfonts = "<link href='http://fonts.googleapis.com/css?family="+fonts+"' rel='stylesheet' type='text/css'>";

				var title = settings.get('title') || 'kreator.js presentation';
				var description = settings.get('description') || 'kreator.js presentation';
				var author = settings.get('author') || 'kreator.js presentation';
				
				$.ajax({
					  type: 'POST'
					, url : '.'
					, dataType : 'jsonpi'
					, params : {
						slides : slides,
						params: settings.get(),
						theme: theme,
						webfont: webfonts,
						title: title,
						description: description,
						author: author
					}
				});
			});

			$('#settings-btn').on('click', function(){
				slideTemplate.showSettings.call($('.reveal'));
			});

			$('.btn-group a').on('click', function(e){
				e.preventDefault();
				var tag = $(this).data('textstyle');
				$(this).toggleClass('active');
				if(tag === 'li') {
					if($(this).hasClass('active'))
						$span = $('<span contentEditable><li></li></span>')
							.on('click', editSpan)
							.appendTo(Kreator.getCurrentSlide())
							.trigger('click').focus();
				}
				if(['b', 'i'].indexOf(tag)>=0) {
					$(this).toggleClass('active');
					$span.html(textStyle.format(tag, $span));
				} else if(['blockquote'].indexOf(tag)>=0) {
					$(this).toggleClass('active');
					textStyle.paragraph(tag, $span);
				} else if(['left', 'center', 'right'].indexOf(tag)>=0) {
					$(this).toggleClass('active');
					textStyle.align(tag, $span);
				} else if(tag === 'a') {
					$(this).toggleClass('active');
					textStyle.insertHiperlink(this, $span);
				} else if(tag === 'move') {
					var s = Kreator.getCurrentSlide();
					$(this).toggleClass('btn-info');
					var section = $('.reveal section');
					if(!$(this).hasClass('active')) {
						$('.present span').off('mousedown', bHandler.moveSpan)
								.attr('contentEditable', true);
					} else {
						$('.present span').on('mousedown', bHandler.moveSpan)
								.attr('contentEditable', false);
					}
					$('.present').toggleClass('crosshair');
				} else if(tag === 'grid') {
		
					if($(this).hasClass('active')) {
						canvas.init();
					} else {
						canvas.remove();
					}
				} else if(tag === 'remove') {
					
					$(this).toggleClass('btn-info');
					$('.present').toggleClass('crosshair');
					
					if($(this).hasClass('active')) {
						$('span').on('click', bHandler.removeSpan);
					} else {
						$('span').off('click', bHandler.removeSpan);
					}
				} else if(tag === 'grid-clear') {
					$(this).toggleClass('active');
					settings.remove(['canvasPoints']);
				} else if(tag === 'upload') {
					slideTemplate.uploadImages.call($(this));
				} else if(tag === 'images') {
					$('.thumbnails').toggle();
				} else if(tag === 'resize') {
					$('.present').toggleClass('resize');
					var img = document.querySelector('.present img');
					if (img) bHandler.imageResize(img);
					if ( ! $(this).hasClass('active') ) {
						var x = Kreator.getSlideX() + 1;
						var y = Kreator.getSlideY() + 1;
						if (y==1) {
							settings.set(['.slides:nth-child('+x+') section img', 'width :' + img.style.width]);
						} else {
							settings.set(['.slides section:nth-child('+x+') section:nth-child('+y+') img', 'width :' + img.style.width]);
						}
					}
				} else if (tag === 'textcolor') {
					var that = $(this);
					if (that.hasClass('active')) {
						var input = $('<input type="color">');
						that.append(input);
						input.on('click', function(e){
							e.stopPropagation();
						}).on('change', function(){
							var color = $(this).val();
							var className = $span.attr('class') || Kreator.generateClassName(2);
							$span.css('color', color).addClass(className);
							$('*', $span).eq(0).css('color', color);
							settings.set(['.' + className, 'color:' + color]);
							$(this).remove();
							that.trigger('click');
						});
					}
				}
			});

			$('.thumbnails img').live('click', function () {
				var el = $('<img>').attr('src', $(this).attr('src'))
					.css('width', '200px')
					.attr('data-path', $(this).attr('data-path'));
				var s = $('<span/>').append(el).appendTo('.present');
				s.on('click', function (e) {
					editSpan(e, this);
				});
			});

			$('#select-dimensions').on('change', function () {
				// create H headings
				var h = $(this).val();
				var html = textStyle.removeHeadings($span.html());
				$span.html('<' + h + '>' + html + '</' + h + '>');
			});

			$('#cl-dimensions').on('change', function(){
				var tag = $(this).val(),
				string = textStyle.paragraph(tag, $span);
				if(string) $span.html(string);
			});

			$('.fullscreen').on('click', function(){
				bHandler.toggleFullscreen();
				Reveal.navigateTo(0,0);
			});

			$(window).on('paste', function(e){
				setTimeout(function(){textStyle.formatCode.call(Kreator, $span);}, 100);
			});

			$('.menu li').on('click', function () {
				var $this = $(this);
				var action = $this.attr('data-title');
				$this.toggleClass('active');
				if(action === 'rotate') {
					$('.menu .active').removeClass('active');
					$this.addClass('active');
					
					$span.css('transform','rotate(10deg)');
					$('#menu-input').val('10deg');
					if(!document.querySelector('#range-handler')) {
						var fragment = document.createDocumentFragment()
						, li = document.createElement('li')
						, range = document.createElement('input');
						range.type="range";
						range.id ="range-handler";
						range.min=-180;
						range.max=180;
						range.addEventListener('change', function(){
							$('#menu-input').val(this.value + ' deg').trigger('keyup');
						}, false);
						li.appendChild(range);
						fragment.appendChild(li);
						document.querySelector('.menu').appendChild(fragment);
					} else {
						$('#range-handler').show();
					}

				} else if(action === 'add class') {
					$('.menu .active').removeClass('active');
					$('#range-handler').hide();
					$(this).addClass('active');
					var clsName = $span.attr('class');
					$('#menu-input').attr('placeholder', 'class name').val(clsName);
				} else if(action === 'clear') {
					var clsName = $span.attr('class');
					settings.remove(clsName);
					$span.removeClass();
					$span.css({
						'transform': 'none',
						'font-family': 'inherit'
					});
				} else if(action === 'font') {
					$('#range-handler').hide();
					$('#menu-input').attr('placeholder', 'font family').val($span.css('font-family'));
					$span.addClass(Kreator.generateClassName(1));
					$('.menu .active').removeClass('active');
					$(this).addClass('active');
				}

			});

			$('#menu-input').on('keyup', function (e) {
				var value = parseInt($(this).val()) || 0;
				var action = $('.menu .active').attr('data-title');
				var clsName = $span.attr('class') || $span.addClass(Kreator.generateClassName(1)) && $span.attr('class');
				
				if(action === 'rotate') {
					$span.css('transform','rotate('+value+'deg)');
					if(clsName) {
						settings.set(['.'+clsName, 'transform: rotate('+value+'deg)']);
					}
				} else if (action === 'add class') {
					if(e.keyCode == 13) {
						var oldCls = $span.attr('class');
						var newCls = $(this).val();
						$span.removeClass().addClass(newCls);
						$('#menu-input').val('');
						settings.copy('.'+oldCls, '.'+newCls);
					}
				} else if (action === 'font') {
					var htag = $span.html();
					htag = htag.match(/<.h?.>/gi);
					if(!$span.attr('data-heading') && htag)
						$span.attr('data-heading', htag[0][2]);
					if(e.keyCode == 13) {
						var family = $(this).val();
						slideTemplate.addMessage(family);
						WebFont.load({
							google: {
								families: [ family ]
							},
							active: function () {
								console.log('active', htag);
								$span.css('font-family', family);
								if($span.attr('data-heading')) {
									htag = 'h' + $span.attr('data-heading');
									$span.html('<'+htag+'>' + $span.html() + '</'+ htag +'>');
									$span.removeAttr('data-heading');
									$('h1', $span).css('font-family', family);
								}
								if(clsName) {
									settings.set(['.'+clsName, 'font-family: ' + family]);
								}
								settings.set(family, 'webfont');
							},
							complete: function () {
								console.log('end');
							}
						});
					}
				}
			});

		};

		Reveal.addEventListener( 'slidechanged', function( event ) {
				Kreator.setSlideX(event.indexh);
				Kreator.setSlideY(event.indexv);
		});

		var generateClassName = function (testClass) {
			var n = parseInt(testClass) + 1;
			while ($('.kreator-class-' + n).length)
				n++;
			return 'kreator-class-' + n;
		}

		var setSlideX = function(x) {
			slideX = x;
		};

		var setSlideY = function(y) {
			slideY = y;
		};

		var getSlideX = function () {
			return slideX;
		}

		var getSlideY = function () {
			return slideY;
		}

		var addContentToSlide = function() {

			var count = $('span', Kreator.getCurrentSlide()).length;
			if ($('.present').hasClass('crosshair') || count > 10) return;

			var d = $('<span contentEditable></span>').on('click', function(e){
				editSpan(e, d);
			})

			d.appendTo($('.present')).trigger('click').focus();

			var list = ($('.btn.active').attr('data-textstyle') === 'li');
			if(list) {
				$('.active').trigger('click');
			}
			if(!count) {
				$('.menu.hidden').removeClass('hidden');
			}
		};
		
		var getLastSpan = function() {
			var s = Kreator.getCurrentSlide();
			var spans = $('span', s);
			return spans.eq(spans.length-1);
		};

		var getCurrentSlide = function() {
			return $('.present');
		};

		var addSlideRight = function() {
			var s = this.getCurrentSlide();
			$('.active').trigger('click');
			// if the current slide is the last slide on the X axis we append to the parent
			if($('.slides>section').length == slideX+1) {
				$('<section/>').on('click', addContentToSlide).appendTo('.slides');
			} else { // else we just append after the current element
				$('<section/>').on('click', addContentToSlide).insertAfter(s);
			}
			$('.menu').addClass('hidden');
		};

		var addSlideDown = function() {
			var s = this.getCurrentSlide();
			$('.active').trigger('click');
			if(s.parent().hasClass('slides')) {
				var c = $('<section/>').append(s.html());
				var ns = $('<section/>');
				s.html('').append(c).append(ns);
			} else {
				$('<section/>').insertAfter(s);
			}

			$('.menu').addClass('hidden');
		};

		var editSpan = function(e, that) {
			
			e.stopPropagation();
			$span = $(that) || $(this);
			var textStyle = htmlEntites.findTags($span.html());
			
			if(textStyle >= 0)
				$('#select-dimensions option:eq('+textStyle+')').attr('selected', 'selected')

			$('.menu').css({
				'top' : e.currentTarget.offsetTop + 27,
				'display' : 'block'
			})
			
		};

		return {
			addSlideDown: addSlideDown,
			addSlideRight: addSlideRight,
			editSpan: editSpan,
			getCurrentSlide: getCurrentSlide,
			setSlideX: setSlideX,
			setSlideY: setSlideY,
			getSlideY : getSlideY,
			getSlideX : getSlideX,
			generateClassName: generateClassName,
			init: init
		};
	})({
		jquery: $,
		reveal: Reveal,
		hljs: hljs,
		settings: settings
	});

	return Kreator;
});