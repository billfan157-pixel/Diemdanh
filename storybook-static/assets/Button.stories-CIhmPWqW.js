import{b as a}from"./iframe-CT42YBi6.js";import"./Button-xEv75nIt.js";import"./preload-helper-C1FmrZbK.js";import"./class-map-BOhrJ1Y0.js";import"./directive-CJw_OlP2.js";import"./if-defined-D_MhRTYw.js";const P={title:"Button",component:"gl-button",argTypes:{variant:{control:"select",options:["primary","secondary","ghost","danger","success"]},size:{control:"select",options:["sm","md","lg"]},disabled:{control:"boolean"},block:{control:"boolean"},icon:{control:"boolean"},slot:{control:"text"}},args:{variant:"primary",size:"md",disabled:!1,block:!1,icon:!1,slot:"Button"},parameters:{viewport:{defaultViewport:"responsive"}}},r={render:t=>a`
    <gl-button
      variant=${t.variant}
      size=${t.size}
      ?disabled=${t.disabled}
      ?block=${t.block}
      ?icon=${t.icon}
    >${t.slot}</gl-button>
  `},n={render:()=>a`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary">Primary</gl-button>
      <gl-button variant="secondary">Secondary</gl-button>
      <gl-button variant="ghost">Ghost</gl-button>
      <gl-button variant="danger">Danger</gl-button>
      <gl-button variant="success">Success</gl-button>
    </div>
  `},e={render:()=>a`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" size="sm">Small</gl-button>
      <gl-button variant="primary" size="md">Medium</gl-button>
      <gl-button variant="primary" size="lg">Large</gl-button>
    </div>
  `},o={render:()=>a`
    <div style="max-width:320px">
      <gl-button variant="primary" block>Full Width Button</gl-button>
    </div>
  `},s={render:()=>a`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" disabled>Primary Disabled</gl-button>
      <gl-button variant="secondary" disabled>Secondary Disabled</gl-button>
      <gl-button variant="ghost" disabled>Ghost Disabled</gl-button>
    </div>
  `};var l,i,d;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: args => html\`
    <gl-button
      variant=\${args.variant}
      size=\${args.size}
      ?disabled=\${args.disabled}
      ?block=\${args.block}
      ?icon=\${args.icon}
    >\${args.slot}</gl-button>
  \`
}`,...(d=(i=r.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};var g,c,b;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary">Primary</gl-button>
      <gl-button variant="secondary">Secondary</gl-button>
      <gl-button variant="ghost">Ghost</gl-button>
      <gl-button variant="danger">Danger</gl-button>
      <gl-button variant="success">Success</gl-button>
    </div>
  \`
}`,...(b=(c=n.parameters)==null?void 0:c.docs)==null?void 0:b.source}}};var u,p,m;e.parameters={...e.parameters,docs:{...(u=e.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" size="sm">Small</gl-button>
      <gl-button variant="primary" size="md">Medium</gl-button>
      <gl-button variant="primary" size="lg">Large</gl-button>
    </div>
  \`
}`,...(m=(p=e.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var v,y,x;o.parameters={...o.parameters,docs:{...(v=o.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => html\`
    <div style="max-width:320px">
      <gl-button variant="primary" block>Full Width Button</gl-button>
    </div>
  \`
}`,...(x=(y=o.parameters)==null?void 0:y.docs)==null?void 0:x.source}}};var f,h,w;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <gl-button variant="primary" disabled>Primary Disabled</gl-button>
      <gl-button variant="secondary" disabled>Secondary Disabled</gl-button>
      <gl-button variant="ghost" disabled>Ghost Disabled</gl-button>
    </div>
  \`
}`,...(w=(h=s.parameters)==null?void 0:h.docs)==null?void 0:w.source}}};const G=["Primary","Variants","Sizes","Block","Disabled"];export{o as Block,s as Disabled,r as Primary,e as Sizes,n as Variants,G as __namedExportsOrder,P as default};
