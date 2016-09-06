"use strict";

var scope = (function() {

	var scopeRegistry = {}, linkerRegistry = {};

	function _linker1(scope, variable, object) {
		if (typeof variable == 'object') {
			for (var i in variable) scope.link(i + '', variable[i + '']);

		} else if ($(object).length > 0) {

			if ($(object).length > 1) {
				console.warn('Object count for link "' + variable + '" more than 1');
			}

			var getValue = function() {},
				setValue = function() {};

			switch (true) {
				case $(object).is(':checkbox'):
					getValue = function() { return $(object).prop('checked'); };
					setValue = function(val) { $(object).prop('checked', val).trigger('refresh'); };
					break;

				case $(object).is('select'):
				case $(object).is('input'):
				case $(object).is('textarea'):
					getValue = function() { return $(object).val(); };
					setValue = function(val) { $(object).val(val).trigger('refresh'); };
					break;
			}

			scope.mitableProperty(variable, {
				apply: function(storage, key) {
					$(object).change($.proxy(function() {
						storage[key] = getValue();
					}, this));
				},

				getter: function(data, key) {
					return data[key];
				},

				setter: function(val, data, key) {
					data[key] = val;
					setValue(val);
					scope.trigger('_propertyModified', [ variable, val ]);
				}
			});
		}
	}

	var _scope = function(element, options) {
		var self     = this;
		this.element = element;

		this.element.find('[data-bind]').each(function() {
			self[$(this).attr('data-bind')] = $(this);
		});

		this.trigger = function(name, args) {
			var spl = name.split(',');
			if (spl.length > 1) {
				for (var i = 0; i < spl.length; i++) self.trigger(spl[i], args);

			} else if (options[name]) {
				return options[name].apply(self, args);
			}
		};

		this.link = function(variable, object) {
			return _linker1(this, variable, object);
		};

		this.mitableProperty = function(property, options) {
			var splitted   = property.split('.'),
				objectPath = splitted.slice(0, -1).join('.'),
				keyName    = splitted.slice(-1).join(),
				mutableObject, rawStorage;

			if (objectPath) {
				if ( ! linkerRegistry[objectPath]) linkerRegistry[objectPath] = {};
				rawStorage = linkerRegistry[objectPath];
			}

			if (1 === splitted.length) {
				mutableObject = self;

			} else {
				objectPath = splitted.slice(0, -1).join('.');
				eval('mutableObject = self.' + objectPath);
			}

			if (mutableObject) {
				if ( ! mutableObject.getData) mutableObject.getData = function() {
					return rawStorage;
				};

				options = $.extend({
					setter: function() {},
					getter: function() {},
					apply : function() {}
				}, options);

				options.apply(rawStorage, keyName);

				Object.defineProperty(mutableObject, keyName, {
					get: function() {
						return options.getter(rawStorage, keyName);
					},

					set: function(val) {
						return options.setter(val, rawStorage, keyName);
					},

					enumerable: true
				});

			} else {
				console.error('Can\'t get object for ' + property);
			}
		};

		this.proxy = function(callback) {
			return $.proxy(callback, this);
		};

		this.element.find('[data-event]').each(function() {
			var _obj = $(this), list = _obj.attr('data-event').split(',');
			for (var j = 0; j < list.length; j++) {
				var a = list[j].split(':');
				(function(_obj, a, b) {
					_obj.on(a, function(event) {
						return self.trigger(b, [ event ]);
					});
				})(_obj, a[0], a[1]);
			}
		});

		this.trigger('init');
	};

	return function() {
		switch (arguments.length) {
			case 1:
				//return scopeRegistry[arguments[0]] ? scopeRegistry[arguments[0]] : $(arguments[0]).data('_scope');
				return $(arguments[0]).data('_scope') ? $(arguments[0]).data('_scope') : undefined;

			case 2:
				scopeRegistry[arguments[0]] = arguments[1];
				break;

			case 3:
			case 4:
				var element = $(arguments[0]);

				switch (arguments[1]) {
					case 'apply':
						if ( ! scopeRegistry[arguments[2]]) console.error('No registry entry for ' + arguments[2]);
						element.data('_scope', new _scope(element, scopeRegistry[arguments[2]]));
						break;

					case 'trigger':
						element.data('_scope').trigger(arguments[2], arguments[3]);
						break;
				}
				break;
		}
	};

})();

$(function() {
	$('[data-scope]').each(function() {
		scope(this, 'apply', $(this).attr('data-scope'));
	});
});
