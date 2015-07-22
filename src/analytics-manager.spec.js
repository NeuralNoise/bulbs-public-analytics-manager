describe("AnalyticsManager", function() {
  var subject;
  var elementWithAttrs;
  var linkHtml = '<a href="#" id="clicked-link" data-track-category="Nav" data-track-action="Logo" data-track-label="/">Track Me</a>';
  var sandbox;

  // PhantomJS doesn't like triggering click events
  function click(el) {
    var ev = document.createEvent("MouseEvent");
    ev.initMouseEvent(
        "click",
        true, true,
        window, null,
        0, 0, 0, 0,
        false, false, false, false,
        0, null
    );
    el.dispatchEvent(ev);
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    window.ga = sandbox.stub();
    sandbox.spy(window.console, 'log');

    subject = require('./analytics-manager');

    $('body').append(linkHtml);
    elementWithAttrs = $('#clicked-link');
  });

  afterEach(function() {
    sandbox.restore();
    elementWithAttrs.remove();
  });

  describe("#init", function() {
    beforeEach(function() {
      sandbox.stub(subject, 'trackClick');
      subject.trackedPaths = ['/', '/section/politics'];
      subject.init();
      click(elementWithAttrs[0]);
    });

    it("calls trackClick when anything in body is clicked", function() {
      expect(subject.trackClick.called).to.be.true;
    });

    it('sets up an empty array of tracked paths', function() {
      expect(subject.trackedPaths).to.eql([]);
    });
  });

  describe("#trackClick", function() {
    var eventStub;

    beforeEach(function () {
      eventStub = {
        preventDefault: sandbox.stub(),
        stopPropagation: sandbox.stub(),
        target: sandbox.stub(),
        keyCode: 13 // Send enter keyCode by default
      };
    });

    describe("clicked element is missing category", function() {
      beforeEach(function() {
        elementWithAttrs.data('track-category', null);
        eventStub.target = elementWithAttrs[0];

        sandbox.stub(subject, 'trackedEvent');

        subject.trackClick(eventStub);
      });

      it("does not try to get the tracked event object from the element", function() {
        expect(subject.trackedEvent.called).to.be.false;
      });
    });

    describe("clicked element is nested under element with data attributes", function() {
      var parentElementWithAttrs, childClickedElement;
      var nestedHtml = '<a href="#" id="parent-link" data-track-category="Nav"><div id="child-clicked" data-track-action="Nested" data-track-label="/some-url"></div></a>';

      beforeEach(function() {
        $('body').append(nestedHtml);
        parentElementWithAttrs = $('#parent-link');
        childClickedElement = $('#child-clicked');
        eventStub.target = childClickedElement[0];

        sandbox.stub(subject, 'sendEvent');

        subject.trackClick(eventStub);
      });

      afterEach(function() {
        parentElementWithAttrs.remove();
      });

      it("sends the event", function() {
        expect(subject.sendEvent.calledWith({
          eventCategory: 'Nav',
          eventAction: 'Nested',
          eventLabel: '/some-url'
        })).to.be.true;
      });
    });

    describe("clicked element has category", function() {
      beforeEach(function() {
        eventStub.target = elementWithAttrs[0];

        sandbox.stub(subject, 'sendEvent');

        subject.trackClick(eventStub);
      });

      describe("debug mode", function() {
        beforeEach(function() {
          window.analyticsTest = true;
          subject.trackClick(eventStub);
        });

        it("prevents default event behavior", function() {
          expect(eventStub.preventDefault.called).to.be.true;
        });
      });

      describe("non-debug mode", function() {
        beforeEach(function() {
          subject.debug = false;
          subject.trackClick(eventStub);
        });

        it("sends the event", function() {
          expect(subject.sendEvent.calledWith({
            eventCategory: 'Nav',
            eventAction: 'Logo',
            eventLabel: '/'
          })).to.be.true;
        });
      });
    });

    describe("clicked element nested under element with data attributes, but also has attributes", function() {
      var nestedFourUp, parentNested;
      var nestedFourUpHtml = '<ol id="parent-nested" class="row four-up" data-track-category="Home" data-track-action="Recirc:New"><li class="item"><a id="nested-four" href="/videos/need-an-email-address-let-this-1008" data-track-label="/videos/need-an-email-address-let-this-1008">Some stuff</a></li></ol>';

      beforeEach(function() {
        $('body').append(nestedFourUpHtml);
        nestedFourUp = $('#nested-four');
        parentNested = $('#parent-nested');
        eventStub.target = nestedFourUp[0];

        sandbox.stub(subject, 'sendEvent');

        subject.trackClick(eventStub);
      });

      afterEach(function() {
        parentNested.remove();
      });

      it("sends the event", function() {
        expect(subject.sendEvent.calledWith({
          eventCategory: 'Home',
          eventAction: 'Recirc:New',
          eventLabel: '/videos/need-an-email-address-let-this-1008'
        })).to.be.true;
      });
    });

    describe("clicked element nested under element with data attributes, in list of other elements", function() {
      var nestedFourUp, parentNested;
      var nestedFourUpHtml = '<ol id="parent-nested" class="row four-up" data-track-category="Home" data-track-action="Recirc:New"><li class="item"><a id="nested-four-one" href="/videos/first-url" data-track-label="/videos/first-url">Some stuff</a></li><li class="item"><a id="nested-four-two" href="/videos/second-url" data-track-label="/videos/second-url">Some stuff</a></li></ol>';

      beforeEach(function() {
        $('body').append(nestedFourUpHtml);
        parentNested = $('#parent-nested');
        nestedFourUp = $('#nested-four-two');
        eventStub.target = nestedFourUp[0];

        sandbox.stub(subject, 'sendEvent');
        
        subject.trackClick(eventStub);
      });

      afterEach(function() {
        parentNested.remove();
      });

      it("sends the event", function() {
        expect(subject.sendEvent.calledWith({
          eventCategory: 'Home',
          eventAction: 'Recirc:New',
          eventLabel: '/videos/second-url'
        })).to.be.true;
      });
    });
  });

  describe("#debugMode", function() {
    afterEach(function() {
      window.analyticsTest = false;
    });

    it("returns false", function() {
      window.analyticsTest = false;
      expect(subject.debugMode()).to.be.false;
    });

    it("returns true", function() {
      window.analyticsTest = true;
      expect(subject.debugMode()).to.be.true;
    });
  });

  describe("#trackedEvent", function() {
    var response;

    beforeEach(function() {
      response = subject.trackedEvent(elementWithAttrs);
    });

    it("returns event category", function() {
      expect(response.eventCategory).to.eql('Nav');
    });

    it("returns event action", function() {
      expect(response.eventAction).to.eql('Logo');
    });

    it("returns event label", function() {
      expect(response.eventLabel).to.eql('/');
    });
  });

  describe("#sendEvent", function() {
    var trackedEvent;

    beforeEach(function() {
      trackedEvent = {
        eventCategory: 'Nav',
        eventAction: 'Home',
        eventLabel: '/'
      };
    });

    afterEach(function() {
      window.analyticsTest = false;
    });

    describe("missing any fields", function() {
      describe("missing category", function() {
        beforeEach(function() {
          window.analyticsTest = true;
          trackedEvent.eventCategory = undefined;
          subject.sendEvent(trackedEvent);
        });

        it("does not send event", function() {
          expect(window.console.log.called).to.be.false;
        });
      });

      describe("missing action", function() {
        beforeEach(function() {
          window.analyticsTest = true;
          trackedEvent.eventAction = undefined;
          subject.sendEvent(trackedEvent);
        });

        it("does not send event", function() {
          expect(window.console.log.called).to.be.false;
        });
      });

      describe("missing label", function() {
        beforeEach(function() {
          window.analyticsTest = true;
          trackedEvent.eventLabel = undefined;
          subject.sendEvent(trackedEvent);
        });

        it("does not send event", function() {
          expect(window.console.log.called).to.be.false;
        });
      });
    });

    describe("debug mode", function() {
      beforeEach(function() {
        window.analyticsTest = true;
        subject.sendEvent(trackedEvent);
      });

      it("console logs the tracked event", function() {
        expect(window.console.log.calledWith(trackedEvent)).to.be.true;
      });
    });

    describe("non debug mode", function() {
      beforeEach(function() {
        window.analyticsTest = false;
        subject.sendEvent(trackedEvent);
      });

      it("sends the event to GA", function() {
        expect(window.ga.calledWith('send', 'event', trackedEvent)).to.be.true;
      });
    });
  });
});