'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _pdfjsDist = require('pdfjs-dist');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var makeCancelable = function makeCancelable(promise) {
  var hasCanceled = false;

  var wrappedPromise = new Promise(function (resolve, reject) {
    promise.then(function (val) {
      return hasCanceled ? reject({ pdf: val, isCanceled: true }) : resolve(val);
    });
    promise.catch(function (error) {
      return hasCanceled ? reject({ isCanceled: true }) : reject(error);
    });
  });

  return {
    promise: wrappedPromise,
    cancel: function cancel() {
      hasCanceled = true;
    }
  };
};

var Pdf = function (_React$Component) {
  _inherits(Pdf, _React$Component);

  _createClass(Pdf, null, [{
    key: 'onDocumentError',
    value: function onDocumentError(err) {
      if (err.isCanceled && err.pdf) {
        err.pdf.destroy();
      }
    }

    // Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
    // use window.btoa' step and without risking a blow of the stack. According to [Jon Leightons's]
    // tests, this appears to be a faster approach: http://jsperf.com/encoding-xhr-image-data/5
    // Jon Leighton https://gist.github.com/jonleighton/958841

  }, {
    key: 'defaultBinaryToBase64',
    value: function defaultBinaryToBase64(arrayBuffer) {
      var base64 = '';
      var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

      var bytes = new Uint8Array(arrayBuffer);
      var byteLength = bytes.byteLength;
      var byteRemainder = byteLength % 3;
      var mainLength = byteLength - byteRemainder;

      var a = void 0;
      var b = void 0;
      var c = void 0;
      var d = void 0;
      var chunk = void 0;

      // Main loop deals with bytes in chunks of 3
      for (var i = 0; i < mainLength; i += 3) {
        // Combine the three bytes into a single integer
        chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63; // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 = [base64, encodings[a], encodings[b], encodings[c], encodings[d]].join('');
      }

      // Deal with the remaining bytes and padding
      if (byteRemainder === 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4; // 3   = 2^2 - 1

        base64 = [base64, encodings[a], encodings[b], '=='].join('');
      } else if (byteRemainder === 2) {
        chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2; // 15    = 2^4 - 1

        base64 = [base64, encodings[a], encodings[b], encodings[c], '='].join('');
      }

      return base64;
    }
  }]);

  function Pdf(props) {
    _classCallCheck(this, Pdf);

    var _this = _possibleConstructorReturn(this, (Pdf.__proto__ || Object.getPrototypeOf(Pdf)).call(this, props));

    _this.state = {};
    _this.onGetPdfRaw = _this.onGetPdfRaw.bind(_this);
    _this.onDocumentComplete = _this.onDocumentComplete.bind(_this);
    _this.onPageComplete = _this.onPageComplete.bind(_this);
    _this.getDocument = _this.getDocument.bind(_this);
    return _this;
  }

  _createClass(Pdf, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.loadPDFDocument(this.props);
      this.renderPdf();
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(newProps) {
      var pdf = this.state.pdf;


      var newDocInit = newProps.documentInitParameters;
      var docInit = this.props.documentInitParameters;

      // Only reload if the most significant source has changed!
      var newSource = newProps.file;
      var oldSource = newSource ? this.props.file : null;
      newSource = newSource || newProps.binaryContent;
      oldSource = newSource && !oldSource ? this.props.binaryContent : oldSource;
      newSource = newSource || newProps.content;
      oldSource = newSource && !oldSource ? this.props.content : oldSource;

      if (newSource && newSource !== oldSource && (newProps.file && newProps.file !== this.props.file || newProps.content && newProps.content !== this.props.content || newDocInit && newDocInit !== docInit || newDocInit && docInit && newDocInit.url !== docInit.url)) {
        this.loadPDFDocument(newProps);
      }

      if (pdf && (newProps.page && newProps.page !== this.props.page || newProps.scale && newProps.scale !== this.props.scale)) {
        this.setState({ page: null });
        pdf.getPage(newProps.page).then(this.onPageComplete);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      var pdf = this.state.pdf;

      if (pdf) {
        pdf.destroy();
      }
      if (this.documentPromise) {
        this.documentPromise.cancel();
      }
    }
  }, {
    key: 'onGetPdfRaw',
    value: function onGetPdfRaw(pdfRaw) {
      var _props = this.props;
      var onContentAvailable = _props.onContentAvailable;
      var onBinaryContentAvailable = _props.onBinaryContentAvailable;
      var binaryToBase64 = _props.binaryToBase64;

      if (typeof onBinaryContentAvailable === 'function') {
        onBinaryContentAvailable(pdfRaw);
      }
      if (typeof onContentAvailable === 'function') {
        var convertBinaryToBase64 = this.defaultBinaryToBase64;
        if (typeof binaryToBase64 === 'function') {
          convertBinaryToBase64 = binaryToBase64;
        }
        onContentAvailable(convertBinaryToBase64(pdfRaw));
      }
    }
  }, {
    key: 'onDocumentComplete',
    value: function onDocumentComplete(pdf) {
      this.setState({ pdf: pdf });
      var _props2 = this.props;
      var onDocumentComplete = _props2.onDocumentComplete;
      var onContentAvailable = _props2.onContentAvailable;
      var onBinaryContentAvailable = _props2.onBinaryContentAvailable;

      if (typeof onDocumentComplete === 'function') {
        onDocumentComplete(pdf.numPages);
      }
      if (typeof onContentAvailable === 'function' || typeof onBinaryContentAvailable === 'function') {
        pdf.getData().then(this.onGetPdfRaw);
      }
      pdf.getPage(this.props.page).then(this.onPageComplete);
    }
  }, {
    key: 'onPageComplete',
    value: function onPageComplete(page) {
      this.setState({ page: page });
      this.renderPdf();
      var onPageComplete = this.props.onPageComplete;

      if (typeof onPageComplete === 'function') {
        onPageComplete(page.pageIndex + 1);
      }
    }
  }, {
    key: 'getDocument',
    value: function getDocument(val) {
      if (this.documentPromise) {
        this.documentPromise.cancel();
      }
      this.documentPromise = makeCancelable((0, _pdfjsDist.getDocument)(val).promise);
      this.documentPromise.promise.then(this.onDocumentComplete).catch(this.onDocumentError);
      return this.documentPromise;
    }
  }, {
    key: 'loadByteArray',
    value: function loadByteArray(byteArray) {
      this.getDocument(byteArray);
    }
  }, {
    key: 'loadPDFDocument',
    value: function loadPDFDocument(props) {
      var _this2 = this;

      if (props.file) {
        var _ret = function () {
          if (typeof props.file === 'string') {
            return {
              v: _this2.getDocument(props.file)
            };
          }
          // Is a File object
          var reader = new FileReader();
          reader.onloadend = function () {
            return _this2.loadByteArray(new Uint8Array(reader.result));
          };
          reader.readAsArrayBuffer(props.file);
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
      } else if (props.binaryContent) {
        this.loadByteArray(props.binaryContent);
      } else if (props.content) {
        var bytes = window.atob(props.content);
        var byteLength = bytes.length;
        var byteArray = new Uint8Array(new ArrayBuffer(byteLength));
        for (var index = 0; index < byteLength; index += 1) {
          byteArray[index] = bytes.charCodeAt(index);
        }
        this.loadByteArray(byteArray);
      } else if (props.documentInitParameters) {
        return this.getDocument(props.documentInitParameters);
      } else {
        throw new Error('react-pdf-js works with a file(URL) or (base64)content. At least one needs to be provided!');
      }
    }
  }, {
    key: 'renderPdf',
    value: function renderPdf() {
      var page = this.state.page;

      if (page) {
        var canvas = this.canvas;

        var canvasContext = canvas.getContext('2d');
        var scale = this.props.scale;

        var viewport = page.getViewport(scale);
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({ canvasContext: canvasContext, viewport: viewport });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var loading = this.props.loading;
      var page = this.state.page;

      return page ? _react2.default.createElement('canvas', { ref: function ref(c) {
          _this3.canvas = c;
        } }) : loading || _react2.default.createElement(
        'div',
        null,
        'Loading PDF...'
      );
    }
  }]);

  return Pdf;
}(_react2.default.Component);

Pdf.displayName = 'react-pdf-js';
Pdf.propTypes = {
  content: _react2.default.PropTypes.string,
  documentInitParameters: _react2.default.PropTypes.shape({
    url: _react2.default.PropTypes.string
  }),
  binaryContent: _react2.default.PropTypes.shape({
    data: _react2.default.PropTypes.any
  }),
  file: _react2.default.PropTypes.any, // Could be File object or URL string.
  loading: _react2.default.PropTypes.any,
  page: _react2.default.PropTypes.number,
  scale: _react2.default.PropTypes.number,
  onContentAvailable: _react2.default.PropTypes.func,
  onBinaryContentAvailable: _react2.default.PropTypes.func,
  binaryToBase64: _react2.default.PropTypes.func,
  onDocumentComplete: _react2.default.PropTypes.func,
  onPageComplete: _react2.default.PropTypes.func
};
Pdf.defaultProps = { page: 1, scale: 1.0 };

exports.default = Pdf;