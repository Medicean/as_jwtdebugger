'use strict';

const WIN = require('ui/window'); // 窗口库
const tabbar = require('ui/tabbar'); // Tab库
const LANG_T = antSword['language']['toastr']; // 通用通知提示

const LANG = require('./language/'); // 插件语言库

const JWT = require('jsonwebtoken');

/**
 * 插件类
 */
class Plugin {
  constructor(opt) {
    let _self = this;
    _self.EncodeFocus = false;
    _self.Data = {
      Secret: '',
      SecB64: false,
      HeaderData: {
        'alg': 'HS256',
        'typ': 'JWT'
      },
      PayloadData: {
        "sub": "Halo AntSword!",
        "name": "AntSwordProject",
        // "iat": Math.round(new Date().getTime() / 1000)
      },
      SignedData: '',
      SignatureVerified: false
    };

    _self.hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    const tabbar = antSword['tabbar'];
    tabbar.addTab(
      `tab_jwtdebugger_${_self.hash}`,
      `<i class="fa fa-bug"></i> JWT-Debugger`,
      null, null, true, true
    );
    _self.maincell = tabbar.cells(`tab_jwtdebugger_${_self.hash}`);
    _self.mainlayout = _self.maincell.attachLayout('2U');

    // 左边 encoder layout
    _self.encoderLayout = _self.createEncoderLayout(_self.mainlayout.cells('a'));
    // 右边 decoder layout
    _self.decoderLayout = _self.createDecoderLayout(_self.mainlayout.cells('b'));

    _self.jwtsign();
  }

  resetData() {
    let _self = this;
    _self.Data.PayloadData = {}
    _self.Data.HeaderData = {}
  }

  jwtsign() {
    let _self = this;
    _self.syncData();
    let secret = Buffer.from(_self.Data.Secret);
    if (_self.Data.SecB64) {
      secret = Buffer.from(secret.toString('base64'));
    }
    JWT.sign(_self.Data.PayloadData, secret, {
      header: _self.Data.HeaderData
    }, function (err, token) {
      if (err) {
        _self.encoderLayout.Encodededitor.session.setValue(JSON.stringify(err));
        return
      }
      _self.Data.SignedData = token
      _self.encoderLayout.Encodededitor.session.setValue(_self.Data.SignedData);
      // _self.jwtverify();
    });
  }

  jwtverify() {
    let _self = this;
    _self.syncData();
    let secret = Buffer.from(_self.Data.Secret);
    if (_self.Data.SecB64) {
      secret = Buffer.from(secret.toString('base64'));
    }
    JWT.verify(_self.Data.SignedData, secret, function (err, decoded) {
      if (err == null) {
        _self.encoderLayout.StatusBar.setText(`<span style="color:green;"><i class="fa fa-check"></i> Signature Verified</span>`);
        if (_self.Data.HeaderData.hasOwnProperty('alg')) {
          _self.decoderLayout.SignatureForm.setItemLabel(
            'alglabel',
            antSword.noxss(_self.Data.HeaderData.alg)
            .replace(/H/ig, 'HMAC')
            .replace(/R/ig, 'RSA')
            .replace(/E/ig, 'ECDSA')
            .replace(/P/ig, 'RSAPSS')
            .replace(/S/ig, 'SHA')
          );
          _self.decoderLayout.HeaderToolbar.setItemText('algbtn', _self.Data.HeaderData.alg);
        }
        return
      }
      let msg = 'Invalid Signature';
      if (err.hasOwnProperty('message')) {
        msg = err.message;
      }
      _self.encoderLayout.StatusBar.setText(`<span style="color:red;"><i class="fa fa-close"></i> ${msg}</span>`);
    });
  }

  jwtdecode() {
    let _self = this;
    _self.syncData();
    let secret = Buffer.from(_self.Data.Secret);
    if (_self.Data.SecB64) {
      secret = Buffer.from(secret.toString('base64'));
    }
    let token = _self.Data.SignedData
    if (token.length == 0) {
      return
    }
    try {
      let decoded = JWT.decode(token, {
        complete: true,
        json: true
      });
      if (decoded) {
        _self.decoderLayout.Headereditor.session.setValue(JSON.stringify(decoded.header, true, '\t'));
        _self.decoderLayout.Payloadeditor.session.setValue(JSON.stringify(decoded.payload, true, '\t'));
      } else {
        _self.decoderLayout.Headereditor.session.setValue(JSON.stringify({
          'alg': 'HS256',
          'typ': 'JWT'
        }, true, '\t'));
        _self.decoderLayout.Payloadeditor.session.setValue(JSON.stringify({}, true, '\t'));
      }
    } catch (err) {
      _self.decoderLayout.Headereditor.session.setValue(JSON.stringify({
        'alg': 'HS256',
        'typ': 'JWT'
      }, true, '\t'));
      _self.decoderLayout.Payloadeditor.session.setValue(JSON.stringify({}, true, '\t'));
    };
    // _self.jwtverify();
  }

  syncData() {
    let _self = this;
    _self.Data.HeaderData = JSON.parse(_self.decoderLayout.Headereditor.session.getValue())
    _self.Data.PayloadData = JSON.parse(_self.decoderLayout.Payloadeditor.session.getValue())
    _self.Data.SignedData = _self.encoderLayout.Encodededitor.session.getValue().replace(/\s/g, '')
  }

  createEncoderLayout(cell) {
    let _self = this;
    let Encoded = cell;
    Encoded.setText(`Encoded: Paste a token here`);
    let Encodededitor = ace.edit(Encoded.cell.lastChild);
    Encodededitor.$blockScrolling = Infinity;
    Encodededitor.setTheme('ace/theme/tomorrow');
    Encodededitor.session.setMode(`ace/mode/antswordjwt`);
    Encodededitor.session.setUseWrapMode(true);
    Encodededitor.session.setTabSize(1);
    Encodededitor.session.setWrapLimitRange(null, null);
    Encodededitor.renderer.setShowGutter(true);
    Encodededitor.session.setValue(_self.Data.SignedData);

    Encodededitor.on('change', function (e) {
      if (Encodededitor.session.getValue().replace(/\s/g, '').length == 0) {
        return
      }
      if (_self.EncodeFocus == true) {
        _self.jwtdecode();
      }
      _self.jwtverify()
    });

    Encodededitor.on('focus', (e) => {
      _self.EncodeFocus = true
    });

    const encodeinter = setInterval(Encodededitor.resize.bind(Encodededitor), 200);
    _self.maincell.attachEvent('onClose', () => {
      clearInterval(encodeinter);
      return true;
    });

    let StatusBar = Encoded.attachStatusBar({
      height: 38,
      text: ''
    });
    return {
      Encoded: Encoded,
      Encodededitor: Encodededitor,
      StatusBar: StatusBar,
    }
  }
  createDecoderLayout(cell) {
    let _self = this;
    let dmainlayout = cell.attachLayout('3E');
    let Header = dmainlayout.cells('a');
    Header.setText(`Header: Algorithm & Token TYPE`);
    Header.setHeight(140);
    // Header.fixSize(false, true);

    let HeaderToolbar = Header.attachToolbar();
    HeaderToolbar.loadStruct([{
      type: 'text',
      text: 'Algorithm:'
    }, {
      type: 'buttonSelect',
      text: 'HS256',
      icon: 'chevron-down',
      id: 'algbtn',
      openAll: true,
      options: [{
        id: 'alg_HS256',
        icon: 'caret-right',
        type: 'button',
        text: "HS256"
      }, {
        id: 'alg_HS384',
        icon: 'caret-right',
        type: 'button',
        text: "HS384"
      }, {
        id: 'alg_HS512',
        icon: 'caret-right',
        type: 'button',
        text: "HS512"
      }]
    }]);


    let Headereditor = ace.edit(Header.cell.lastChild);
    Headereditor.$blockScrolling = Infinity;
    Headereditor.setTheme('ace/theme/tomorrow');
    Headereditor.session.setMode(`ace/mode/json`);
    Headereditor.session.setUseWrapMode(true);
    Headereditor.session.setWrapLimitRange(null, null);

    Headereditor.session.setValue(JSON.stringify(_self.Data.HeaderData, null, '\t'))

    Headereditor.on('change', function (e) {
      try {
        JSON.parse(Headereditor.session.getValue())
      } catch (err) {
        return
      }
      if (_self.EncodeFocus == false) {
        _self.jwtsign()
      }
    });

    Headereditor.on('focus', (e) => {
      _self.EncodeFocus = false
    });

    let Payload = dmainlayout.cells('b');
    Payload.setText(`Payload: DATA`);
    let Payloadeditor = ace.edit(Payload.cell.lastChild);
    Payloadeditor.$blockScrolling = Infinity;
    Payloadeditor.setTheme('ace/theme/tomorrow');
    Payloadeditor.session.setMode(`ace/mode/json`);
    Payloadeditor.session.setUseWrapMode(true);
    Payloadeditor.session.setWrapLimitRange(null, null);

    Payloadeditor.session.setValue(JSON.stringify(_self.Data.PayloadData, null, '\t'))

    Payloadeditor.on('change', function (e) {
      try {
        JSON.parse(Payloadeditor.session.getValue());
      } catch (err) {
        return
      }
      if (_self.EncodeFocus == false) {
        _self.jwtsign()
      }
    });

    Payloadeditor.on('focus', (e) => {
      _self.EncodeFocus = false
    });

    let Signature = dmainlayout.cells('c');
    Signature.setHeight(240);
    // Signature.fixSize(false, true);
    Signature.setText(`VERIFY SIGNATURE`);
    let SignatureForm = Signature.attachForm([{
        type: "settings",
        position: "label-left",
        inputWidth: "400",
        labelWidth: "100"
      },
      {
        type: "label",
        label: "HMACSHA256(",
        name: 'alglabel'
      },
      {
        type: "block",
        width: "auto",
        blockOffset: "100",
        list: [{
            type: "settings",
            position: "label-left",
            labelWidth: "100",
            inputWidth: 130
          },
          {
            type: "label",
            label: "base64UrlEncode(header) + \".\" +",
            labelWidth: "300"
          },
          {
            type: "label",
            label: "base64UrlEncode(payload),",
            labelWidth: "300"
          },
          {
            type: "input",
            labelWidth: "40",
            inputWidth: "200",
            label: "secret",
            value: "",
            name: 'secret',
            rows: 3
          }
        ]
      }, {
        type: "settings",
        position: "label-right",
        labelWidth: "200"
      }, {
        type: "block",
        width: "auto",
        list: [{
            type: "label",
            label: ")",
            labelWidth: "10"
          },
          {
            type: "newcolumn"
          },
          {
            type: "checkbox",
            name: 'b64secbtn',
            label: "secret base64 encoded",
            value: ""
          }
        ]
      }
    ]);

    // 输入框
    SignatureForm.attachEvent('onInputChange', (id, value) => {
      if (id == 'secret') {
        _self.Data.Secret = value;
        _self.EncodeFocus = false;
        _self.jwtsign();
        return;
      }
    });
    SignatureForm.attachEvent('onChange', (id, value, state) => {
      if (id == 'b64secbtn') {
        _self.Data.SecB64 = state;
        _self.EncodeFocus = false;
        _self.jwtsign();
        return;
      }
    });

    HeaderToolbar.attachEvent('onClick', (id) => {
      if (id.startsWith('alg_')) {
        _self.EncodeFocus = false;
        _self.Data.HeaderData.alg = HeaderToolbar.getListOptionText('algbtn', id);
        HeaderToolbar.setItemText('algbtn', _self.Data.HeaderData.alg);
        Headereditor.session.setValue(JSON.stringify(_self.Data.HeaderData, null, '\t'))
        return
      }
    });

    const inter = setInterval(() => {
      Headereditor.resize.bind(Headereditor);
      Payloadeditor.resize.bind(Payloadeditor);
    }, 200);
    _self.maincell.attachEvent('onClose', () => {
      clearInterval(inter);
      return true;
    });

    return {
      HeaderLayer: Header,
      Headereditor: Headereditor,
      HeaderToolbar: HeaderToolbar,
      // HeaderForm: HeaderForm,
      PayloadLayer: Payload,
      Payloadeditor: Payloadeditor,
      SignatureLayer: Signature,
      SignatureForm: SignatureForm,
    }
  }
}

module.exports = Plugin;