import{i as u,a as f,b as l}from"./iframe-CT42YBi6.js";import{e as y}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const o=class o extends u{constructor(){super(),this.color="neutral",this.small=!1}render(){return l`
      <span class="badge ${y({["badge-"+this.color]:!0,"badge-xs":this.small})}">
        <slot></slot>
      </span>
    `}};o.styles=f`
    :host { display: inline-flex; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .badge-xs { padding: 1px 6px; font-size: 10px; }
    .badge-primary { background: var(--color-primary-soft); color: var(--color-primary); }
    .badge-success { background: var(--color-success-soft); color: var(--color-success); }
    .badge-danger { background: var(--color-danger-soft); color: var(--color-danger); }
    .badge-warn { background: #fff7ed; color: #ea580c; }
    .badge-gold { background: var(--color-gold-soft); color: var(--color-gold); }
    .badge-neutral { background: var(--color-bg-hover); color: var(--color-text-secondary); }
  `,o.properties={color:{type:String},small:{type:Boolean}};let s=o;customElements.define("gl-badge",s);const S={title:"Badge",component:"gl-badge",argTypes:{color:{control:"select",options:["primary","success","danger","warn","gold","neutral"]},small:{control:"boolean"}},args:{color:"primary",small:!1}},r={render:()=>l`<gl-badge color="primary">Mới</gl-badge>`},e={render:()=>l`
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <gl-badge color="primary">Primary</gl-badge>
      <gl-badge color="success">Success</gl-badge>
      <gl-badge color="danger">Danger</gl-badge>
      <gl-badge color="warn">Warn</gl-badge>
      <gl-badge color="gold">Gold</gl-badge>
      <gl-badge color="neutral">Neutral</gl-badge>
    </div>
  `},a={render:()=>l`<gl-badge color="danger" small>3</gl-badge>`};var g,d,c;r.parameters={...r.parameters,docs:{...(g=r.parameters)==null?void 0:g.docs,source:{originalSource:'{\n  render: () => html`<gl-badge color="primary">Mới</gl-badge>`\n}',...(c=(d=r.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};var n,t,i;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <gl-badge color="primary">Primary</gl-badge>
      <gl-badge color="success">Success</gl-badge>
      <gl-badge color="danger">Danger</gl-badge>
      <gl-badge color="warn">Warn</gl-badge>
      <gl-badge color="gold">Gold</gl-badge>
      <gl-badge color="neutral">Neutral</gl-badge>
    </div>
  \`
}`,...(i=(t=e.parameters)==null?void 0:t.docs)==null?void 0:i.source}}};var p,b,m;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:'{\n  render: () => html`<gl-badge color="danger" small>3</gl-badge>`\n}',...(m=(b=a.parameters)==null?void 0:b.docs)==null?void 0:m.source}}};const k=["Default","AllColors","Small"];export{e as AllColors,r as Default,a as Small,k as __namedExportsOrder,S as default};
