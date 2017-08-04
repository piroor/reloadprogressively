var ProgressiveReloadService = {
	get max()
	{
		return this.getPref('extensions.reloadprogressively@piro.sakura.ne.jp.max');
	},

	init : function()
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);
		this.initTabBrowser(gBrowser);

		var appcontent = document.getElementById('appcontent');
		appcontent.addEventListener('SubBrowserAdded', this, false);
	},

	destroy : function()
	{
		window.removeEventListener('unload', this, false);

		var appcontent = document.getElementById('appcontent');
		appcontent.removeEventListener('SubBrowserAdded', this, false);
	},

	initTabBrowser : function(aTabBrowser)
	{
		aTabBrowser.reloadTab = function reloadTab(aTab) {
			if (ProgressiveReloadService.canStartReload(aTab)) {
				if (ProgressiveReloadService.readyToReload(aTab));
					aTab.linkedBrowser.reload();
			}
			else {
				ProgressiveReloadService.reloadWithDelay(aTab);
			}
		};

		aTabBrowser.reloadAllTabs = function reloadAllTabs() {
			Array.slice(this.tabContainer.childNodes).forEach(this.reloadTab, this);
		};
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
			case 'error':
				aEvent.currentTarget.removeEventListener('DOMContentLoaded', this, false);
				aEvent.currentTarget.removeEventListener('error', this, false);
				aEvent.currentTarget.__reload__linkedTab.removeAttribute('reloading');
				delete aEvent.currentTarget.__reload__linkedTab;
				return;

			case 'SubBrowserAdded':
				this.initTabBrowser(aEvent.originalTarget.browser);
				return;

			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;
		}
	},

	getTabBrowserFromChild : function(aTab)
	{
		var b = aTab.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tabbrowser"] | '+
				'ancestor-or-self::*[local-name()="tabs"][@tabbrowser]',
				aTab,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
		return (b && b.tabbrowser) || b;
	},

	getFirstPendingTab : function(aTabBrowser)
	{
		return aTabBrowser.ownerDocument.evaluate(
					'descendant::*[@pending-reload="true"][1]',
					aTabBrowser.tabContainer,
					null,
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				).singleNodeValue;
	},

	getReloadingTabsCount : function(aTabBrowser)
	{
		return aTabBrowser.ownerDocument.evaluate(
					'count(descendant::*[@reloading="true"])',
					aTabBrowser.tabContainer,
					null,
					XPathResult.NUMBER_TYPE,
					null
				).numberValue;
	},

	canStartReload : function(aTab)
	{
		var b = this.getTabBrowserFromChild(aTab);
		return this.getReloadingTabsCount(b) < this.max;
	},

	readyToReload : function(aTab)
	{
		aTab.removeAttribute('pending-reload');
		aTab.setAttribute('reloading', true);
		aTab.linkedBrowser.__reload__linkedTab = aTab;
		aTab.linkedBrowser.addEventListener('DOMContentLoaded', this, false);
		aTab.linkedBrowser.addEventListener('error', this, false);

		return !this.ensureLoaded(aTab);
	},

	ensureLoaded : function(aTab) 
	{
		// for BarTap ( https://addons.mozilla.org/firefox/addon/67651 )
		if (
			aTab.getAttribute('ontap') == 'true' &&
			'BarTap' in window &&
			'loadTabContents' in BarTap
			) {
			BarTap.loadTabContents(aTab);
			return true;
		}
		return false;
	},

	reloadWithDelay : function(aTab)
	{
		var b = this.getTabBrowserFromChild(aTab);

		aTab.removeAttribute('reloading');
		aTab.setAttribute('pending-reload', true);
		aTab.setAttribute('busy', true);
		b.updateIcon(aTab);
		b.setTabTitleLoading(aTab);

		if (!b.reloadWithDelayTimer)
			b.reloadWithDelayTimer = window.setInterval(this.delayedReloadCheck, 100, this, b);
	},

	delayedReloadCheck : function(aSelf, aTabBrowser)
	{
		var tab = aSelf.getFirstPendingTab(aTabBrowser);
		if (!tab) {
			window.clearInterval(aTabBrowser.reloadWithDelayTimer);
			aTabBrowser.reloadWithDelayTimer = null;
			return;
		}

		if (aSelf.canStartReload(tab))
			aTabBrowser.reloadTab(tab);
	}
};
ProgressiveReloadService.__proto__ = window['piro.sakura.ne.jp'].prefs;

window.addEventListener('load', ProgressiveReloadService, false);
