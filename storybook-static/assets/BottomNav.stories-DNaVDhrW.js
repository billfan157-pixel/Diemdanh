import{i as p,a as g,b as t}from"./iframe-CT42YBi6.js";import{e as m}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const o=class o extends p{constructor(){super(),this.tabs=[],this.activeTab=""}_onTabClick(a){this.dispatchEvent(new CustomEvent("gl-nav-change",{detail:{tabId:a},bubbles:!0,composed:!0}))}render(){return t`
      ${this.tabs.map(a=>t`
        <button
          class="tab ${m({active:a.id===this.activeTab})}"
          @click=${()=>this._onTabClick(a.id)}
          aria-label=${a.label}
          aria-current=${a.id===this.activeTab?"page":""}
        >
          <span class="tab-icon">${a.icon}</span>
          <span>${a.label}</span>
          ${a.badge?t`<span class="tab-badge">${a.badge>99?"99+":a.badge}</span>`:""}
        </button>
      `)}
    `}};o.styles=g`
    :host {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-top: 1px solid var(--glass-border);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      z-index: var(--z-fixed, 900);
      padding-bottom: env(safe-area-inset-bottom, 0);
      height: calc(var(--mobile-bottombar-height, 66px) + env(safe-area-inset-bottom, 0px));
    }
    .tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: var(--space-1) 0;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-family: var(--font-family-display);
      font-size: 11px;
      font-weight: 600;
      position: relative;
      transition: all var(--duration-fast) var(--easing-standard);
      -webkit-tap-highlight-color: transparent;
      min-height: 48px;
    }
    .tab:active {
      transform: scale(0.92);
    }
    .tab.active {
      color: var(--color-primary);
      font-weight: 800;
    }
    .tab.active::after {
      content: '';
      position: absolute;
      top: 0;
      width: 32px;
      height: 3px;
      background: var(--color-primary);
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.5);
    }
    .tab-icon {
      font-size: 1.35rem;
      line-height: 1;
      transition: transform var(--duration-fast) var(--easing-spring);
    }
    .tab.active .tab-icon {
      transform: translateY(-2px) scale(1.1);
    }
    .tab-badge {
      position: absolute;
      top: 4px;
      right: 50%;
      margin-right: -14px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: var(--color-danger);
      color: white;
      font-size: 10px;
      font-weight: 800;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }

    @media (min-width: 768px) {
      :host { display: none; }
    }
  `,o.properties={tabs:{type:Array},activeTab:{type:String}};let i=o;customElements.define("gl-bottom-nav",i);const y={title:"BottomNav",component:"gl-bottom-nav"},h=[{id:"dashboard",label:"Tổng quan",icon:"📊"},{id:"classes",label:"Lớp",icon:"📚"},{id:"profile",label:"Cá nhân",icon:"👤"}],e={render:()=>t`<gl-bottom-nav .tabs=${h} activeTab="classes"></gl-bottom-nav>`},n={render:()=>t`
    <gl-bottom-nav .tabs=${[{id:"a",label:"Trang chủ",icon:"🏠"},{id:"b",label:"Thông báo",icon:"🔔",badge:5},{id:"c",label:"Cá nhân",icon:"👤"}]} activeTab="a"></gl-bottom-nav>
  `};var r,s,l;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:'{\n  render: () => html`<gl-bottom-nav .tabs=${tabs} activeTab="classes"></gl-bottom-nav>`\n}',...(l=(s=e.parameters)==null?void 0:s.docs)==null?void 0:l.source}}};var c,b,d;n.parameters={...n.parameters,docs:{...(c=n.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => html\`
    <gl-bottom-nav .tabs=\${[{
    id: 'a',
    label: 'Trang chủ',
    icon: '🏠'
  }, {
    id: 'b',
    label: 'Thông báo',
    icon: '🔔',
    badge: 5
  }, {
    id: 'c',
    label: 'Cá nhân',
    icon: '👤'
  }]} activeTab="a"></gl-bottom-nav>
  \`
}`,...(d=(b=n.parameters)==null?void 0:b.docs)==null?void 0:d.source}}};const T=["Default","WithBadge"];export{e as Default,n as WithBadge,T as __namedExportsOrder,y as default};
