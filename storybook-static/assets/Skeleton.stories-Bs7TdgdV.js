import{E as U,i as W,a as Z,b as n}from"./iframe-CT42YBi6.js";import{e as q,i as D,t as F}from"./directive-CJw_OlP2.js";import"./preload-helper-C1FmrZbK.js";/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const R="important",H=" !"+R,J=q(class extends D{constructor(r){var e;if(super(r),r.type!==F.ATTRIBUTE||r.name!=="style"||((e=r.strings)==null?void 0:e.length)>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(r){return Object.keys(r).reduce((e,s)=>{const t=r[s];return t==null?e:e+`${s=s.includes("-")?s:s.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${t};`},"")}update(r,[e]){const{style:s}=r.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(e)),this.render(e);for(const t of this.ft)e[t]==null&&(this.ft.delete(t),t.includes("-")?s.removeProperty(t):s[t]=null);for(const t in e){const a=e[t];if(a!=null){this.ft.add(t);const u=typeof a=="string"&&a.endsWith(H);t.includes("-")||u?s.setProperty(t,u?a.slice(0,-11):a,u?R:""):s[t]=a}}return U}}),h=class h extends W{constructor(){super(),this.variant="text",this.width="",this.height=""}render(){const e={};return this.width&&(e.width=this.width),this.height&&(e.height=this.height),n`
      <div class="skeleton skeleton-${this.variant}" style=${J(e)}></div>
    `}};h.styles=Z`
    :host { display: block; }
    .skeleton {
      background: linear-gradient(90deg, var(--color-bg-hover) 25%, var(--color-bg-elevated) 50%, var(--color-bg-hover) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm);
      pointer-events: none;
      user-select: none;
    }
    .skeleton-text { height: 14px; width: 100%; }
    .skeleton-text-sm { height: 11px; width: 60%; }
    .skeleton-title { height: 24px; width: 50%; }
    .skeleton-avatar { width: 40px; height: 40px; border-radius: var(--radius-full); }
    .skeleton-button { height: 36px; width: 80px; border-radius: var(--radius-md); }
    .skeleton-card { height: 80px; width: 100%; }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,h.properties={variant:{type:String},width:{type:String},height:{type:String}};let m=h;customElements.define("gl-skeleton",m);const V={title:"Skeleton",component:"gl-skeleton",argTypes:{variant:{control:"select",options:["text","title","avatar","card","button"]},width:{control:"text"},height:{control:"text"}},args:{variant:"text",width:"",height:""}},o={render:()=>n`<gl-skeleton variant="text"></gl-skeleton>`},l={render:()=>n`<gl-skeleton variant="title"></gl-skeleton>`},i={render:()=>n`<gl-skeleton variant="avatar"></gl-skeleton>`},d={render:()=>n`<gl-skeleton variant="card"></gl-skeleton>`},c={render:()=>n`<gl-skeleton variant="button"></gl-skeleton>`},g={render:()=>n`<gl-skeleton variant="text" width="80%" height="20px"></gl-skeleton>`},p={render:()=>n`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <gl-skeleton variant="avatar"></gl-skeleton>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <gl-skeleton variant="title"></gl-skeleton>
          <gl-skeleton variant="text"></gl-skeleton>
          <gl-skeleton variant="text" width="60%"></gl-skeleton>
        </div>
      </div>
      <gl-skeleton variant="card"></gl-skeleton>
      <div style="display:flex;gap:8px;">
        <gl-skeleton variant="button"></gl-skeleton>
        <gl-skeleton variant="button"></gl-skeleton>
      </div>
    </div>
  `};var k,v,x;o.parameters={...o.parameters,docs:{...(k=o.parameters)==null?void 0:k.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="text"></gl-skeleton>`\n}',...(x=(v=o.parameters)==null?void 0:v.docs)==null?void 0:x.source}}};var y,f,b;l.parameters={...l.parameters,docs:{...(y=l.parameters)==null?void 0:y.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="title"></gl-skeleton>`\n}',...(b=(f=l.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var w,S,T;i.parameters={...i.parameters,docs:{...(w=i.parameters)==null?void 0:w.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="avatar"></gl-skeleton>`\n}',...(T=(S=i.parameters)==null?void 0:S.docs)==null?void 0:T.source}}};var C,E,$;d.parameters={...d.parameters,docs:{...(C=d.parameters)==null?void 0:C.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="card"></gl-skeleton>`\n}',...($=(E=d.parameters)==null?void 0:E.docs)==null?void 0:$.source}}};var z,A,B;c.parameters={...c.parameters,docs:{...(z=c.parameters)==null?void 0:z.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="button"></gl-skeleton>`\n}',...(B=(A=c.parameters)==null?void 0:A.docs)==null?void 0:B.source}}};var O,j,P;g.parameters={...g.parameters,docs:{...(O=g.parameters)==null?void 0:O.docs,source:{originalSource:'{\n  render: () => html`<gl-skeleton variant="text" width="80%" height="20px"></gl-skeleton>`\n}',...(P=(j=g.parameters)==null?void 0:j.docs)==null?void 0:P.source}}};var I,L,M;p.parameters={...p.parameters,docs:{...(I=p.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <gl-skeleton variant="avatar"></gl-skeleton>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <gl-skeleton variant="title"></gl-skeleton>
          <gl-skeleton variant="text"></gl-skeleton>
          <gl-skeleton variant="text" width="60%"></gl-skeleton>
        </div>
      </div>
      <gl-skeleton variant="card"></gl-skeleton>
      <div style="display:flex;gap:8px;">
        <gl-skeleton variant="button"></gl-skeleton>
        <gl-skeleton variant="button"></gl-skeleton>
      </div>
    </div>
  \`
}`,...(M=(L=p.parameters)==null?void 0:L.docs)==null?void 0:M.source}}};const X=["Text","Title","Avatar","Card","Button","CustomSize","Composition"];export{i as Avatar,c as Button,d as Card,p as Composition,g as CustomSize,o as Text,l as Title,X as __namedExportsOrder,V as default};
