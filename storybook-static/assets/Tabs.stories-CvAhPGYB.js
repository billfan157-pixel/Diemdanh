import{i as p,a as h,b as r}from"./iframe-CT42YBi6.js";import{e as m}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const s=class s extends p{constructor(){super(),this.tabs=[],this.activeTab=""}_onTabClick(a){this.activeTab=a,this.dispatchEvent(new CustomEvent("gl-tab-change",{detail:{tabId:a},bubbles:!0,composed:!0}))}render(){return r`
      <div class="tabs" role="tablist">
        ${this.tabs.map(a=>r`
          <button
            type="button"
            class="tab ${m({active:a.id===this.activeTab})}"
            role="tab"
            aria-selected=${a.id===this.activeTab}
            @click=${()=>this._onTabClick(a.id)}
          >${a.label}</button>
        `)}
      </div>
    `}};s.styles=h`
    :host { display: block; }
    .tabs {
      display: flex;
      gap: var(--space-1);
      padding: var(--space-1);
      background: var(--color-bg-active);
      border-radius: var(--radius-md);
    }
    .tab {
      flex: 1;
      min-height: var(--touch-target-min);
      padding: var(--space-2) var(--space-3);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-secondary);
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: 700;
      cursor: pointer;
      transition: all var(--duration-fast);
      white-space: nowrap;
    }
    .tab:hover { color: var(--color-text); }
    .tab.active {
      background: var(--color-bg-elevated);
      color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    @media (max-width: 767px) {
      .tabs { overflow-x: auto; }
      .tab { flex: 0 0 auto; }
    }
  `,s.properties={tabs:{type:Array},activeTab:{type:String}};let n=s;customElements.define("gl-tabs",n);const T={title:"Tabs",component:"gl-tabs",argTypes:{activeTab:{control:"text"}},args:{activeTab:"hk1"}},t={render:()=>r`
    <gl-tabs
      .tabs=${[{id:"hk1",label:"HK1"},{id:"hk2",label:"HK2"},{id:"year",label:"Cả năm"}]}
      activeTab="hk1"
    ></gl-tabs>
  `},e={render:()=>r`
    <gl-tabs
      .tabs=${[{id:"cards",label:"🃏 Thẻ"},{id:"table",label:"📊 Bảng"},{id:"rank",label:"🏆 Xếp hạng"},{id:"stats",label:"📈 Thống kê"}]}
      activeTab="cards"
    ></gl-tabs>
  `};var i,o,l;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => html\`
    <gl-tabs
      .tabs=\${[{
    id: 'hk1',
    label: 'HK1'
  }, {
    id: 'hk2',
    label: 'HK2'
  }, {
    id: 'year',
    label: 'Cả năm'
  }]}
      activeTab="hk1"
    ></gl-tabs>
  \`
}`,...(l=(o=t.parameters)==null?void 0:o.docs)==null?void 0:l.source}}};var c,b,d;e.parameters={...e.parameters,docs:{...(c=e.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => html\`
    <gl-tabs
      .tabs=\${[{
    id: 'cards',
    label: '🃏 Thẻ'
  }, {
    id: 'table',
    label: '📊 Bảng'
  }, {
    id: 'rank',
    label: '🏆 Xếp hạng'
  }, {
    id: 'stats',
    label: '📈 Thống kê'
  }]}
      activeTab="cards"
    ></gl-tabs>
  \`
}`,...(d=(b=e.parameters)==null?void 0:b.docs)==null?void 0:d.source}}};const f=["Default","FourTabs"];export{t as Default,e as FourTabs,f as __namedExportsOrder,T as default};
