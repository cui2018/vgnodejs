if ( !global.XML2JS ) global.XML2JS = require("xml2js");
if ( !global.XML2Builder ) global.XML2Builder = new XML2JS.Builder();
if ( !global.XML2Parser ) global.XML2Parser = new XML2JS.Parser( {
	explicitArray : false,
	ignoreAttrs : true
} );
class Xml {
	encode(json) {
		let xml = XML2Builder.buildObject(json);
		return xml;
	}
	decode(xml,fn) {
		XML2Parser.parseString(xml, (err,json) => {
			fn(json);
		} );
	}
}
module.exports = Xml;