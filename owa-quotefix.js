// quote fix for OWA 2007
var LINE_LENGTH = 72;
function HEADER_FORMAT(sent,from) { return "On " + sent + ", " + from + " wrote:"; };
var HEADER_REGEX = /^On .*, .* wrote:$/;
var QUOTE_LEADER = "> ";
var QUOTE_REGEX = /^[>| ]/;
var EXTRACT_PREFIX_REGEX = /^((?:Re:|Fw:|Fwd:|AW:|WG:)\s*)(.*)/i;
var CATCH_SAVE_BUTTON = true;

function fixQuote(txt)
{
       	m = txt.match(/([\s\S]*?)\n________________________________________(\n[\s\S]*?\n)\n([\s\S]*)/);
	if(!m)
		return txt;

	var mytext = m[1];
	var headers = m[2];
	var quote = m[3];

	// fix signature
	mytext = mytext.replace(/\n--\n/, "\n-- \n");

	// fix quoting
	quote = quote.replace(/\n*$/, "");
	quote = quote.replace(/(^|\n)/g, "$1" + QUOTE_LEADER);
	quote = quote + "\n";

	// fix shorten the header
	m = headers.match(/\n(?:From|Von): (.*?)\n/);
	if(!m)
		throw "no from";
	var from = m[1];
	m = headers.match(/\n(?:Sent|Gesendet): (.*?)\n/);
	if(!m)
		throw "no sent";
	var sent = m[1];
	var shortheader = HEADER_FORMAT(sent, from);

	// build new message
	txt = shortheader + "\n" + quote + "\n" + mytext;

	return txt;
}

function wrapLine(l)
{
	var out = "";

	// don't wrap unless we need to
	if(l.length <= LINE_LENGTH)
		return l;

	var wrappos = LINE_LENGTH;
	while(wrappos > 0 && l.substr(wrappos, 1) != " ")
		--wrappos;
	if(wrappos == 0)
	{
		wrappos = LINE_LENGTH + 1;
		while(wrappos < l.length && l.substr(wrappos, 1) != " ")
			++wrappos;
		if(wrappos == l.length)
			return l; // cannot wrap
	}
	return l.substr(0, wrappos) + "\n" + wrapLine(l.substr(wrappos + 1));
}

function tryWrapLine(l)
{
	// don't wrap quote lines
	if(l.match(QUOTE_REGEX))
		return l;

	// don't wrap quoteheader lines
	if(l.match(HEADER_REGEX))
		return l;

	return wrapLine(l);
}

function fixWrap(txt)
{
	var lines = txt.split(/\n/);
	for(var l in lines)
		lines[l] = tryWrapLine(lines[l]);
	return lines.join("\n");
}

try
{
	var m;

	var ta = $('td.bdy textarea');
	var snb = $('#lnkHdrsend');
	var svb = $('#lnkHdrsave');
	var sbj = $('#txtsbj');
	if(snb.length != 1 || svb.length != 1 || ta.length != 1 || sbj.length != 1)
		throw "wrong page";

	var snb2 = $('#lnkHdrsend2');
	var svb2 = $('#lnkHdrsave2');
	if(snb2.length != 0 || svb2.length != 0)
		throw "wrong page";

	snb.css("display", "none");
	snb2 = $('<a href="#" class="btn" title="Send" id="lnkHdrsend2"><img src="' + chrome.extension.getURL("Gtk-mail-send.svg") + '" width=15 height=15 alt>Send (QuoteFix)</a>');
	snb2.insertAfter(snb);

	svb2 = $('<a href="#" class="btn" title="Save" id="lnkHdrsave2"><img src="' + chrome.extension.getURL("Gtk-save-as.svg") + '" width=15 height=15 alt>Save (QuoteFix)</a>');

	if(CATCH_SAVE_BUTTON)
	{
		svb.css("display", "none");
		svb2.insertAfter(svb);
	}

	function tryFixQuote()
	{
		var m;
		var sub = sbj.val();
		var sub0 = sub;
		m = sub.match(EXTRACT_PREFIX_REGEX);
		if(m)
		{
			var prefix = m[1];
			sub = m[2];
			while((m = sub.match(EXTRACT_PREFIX_REGEX)))
				sub = m[2];
			sub = prefix + sub;
		}
		if(sub != sub0)
		{
			// run onChange handler
			sbj.val(sub);
			var changeEvent = document.createEvent("HTMLEvents");
			changeEvent.initEvent("change", true, true);
			sbj[0].dispatchEvent(changeEvent);
		}

		var txt = ta.val();
		var txt0 = txt;
		if(txt == "")
		{
			setTimeout(tryFixQuote, 2000); // retry till we have text
			return;
		}

		txt = fixQuote(txt);
		if(txt != txt0)
		{
			// run onChange handler
			ta.val(txt);
			var changeEvent = document.createEvent("HTMLEvents");
			changeEvent.initEvent("change", true, true);
			ta[0].dispatchEvent(changeEvent);
		}

		function wrapClick(btn, e)
		{
			txt = ta.val();
			txt0 = txt;
			txt = fixWrap(txt);
			if(txt == txt0)
			{
				// run original handler
				var clickEvent = document.createEvent("HTMLEvents");
				clickEvent.initEvent("click", true, true);
				btn[0].dispatchEvent(clickEvent);
			}
			else
			{
				// change value
				ta.val(txt);

				// run onChange handler only
				var changeEvent = document.createEvent("HTMLEvents");
				changeEvent.initEvent("change", true, true);
				ta[0].dispatchEvent(changeEvent);
			}
			return false;
		}
		snb2.click(function(e) { wrapClick(snb, e); });
		svb2.click(function(e) { wrapClick(svb, e); });
	}

	tryFixQuote();
}
catch(e)
{
	if(e != "wrong page")
		alert(e);
}
