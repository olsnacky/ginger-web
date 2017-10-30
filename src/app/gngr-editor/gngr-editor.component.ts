import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import 'ace-builds/src-min-noconflict/theme-monokai';
import 'brace';
import 'brace/ext/searchbox';
// import 'brace/ext/statusbar';
import 'brace/mode/gngr';
import { Network, DataSet, Node, Edge, IdType } from 'vis';
// import { D3Service, D3, Selection } from 'd3-ng2-service';
// import { TreeModel, NodeEvent } from 'ng2-tree';

@Component({
  selector: 'app-gngr-editor',
  templateUrl: './gngr-editor.component.html',
  styleUrls: ['./gngr-editor.component.css']
})
export class GngrEditorComponent implements OnInit {
  @ViewChild('editor') editor;
  // public tree: TreeModel;
  // private d3: D3;
  // private parentNativeElement: any;
  // private d3Svg: Selection<SVGSVGElement, any, null, undefined>;
  // public nodes: Node;
  // public edges: Edge;
  // private defaultCode = 'var x\nx:=1';
  private network: Network;
  private canvasWidth;
  private canvasHeight;
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private hasInterference = null;

  codeExamples = {
    // default: 'var x\nx := 1',
    assignment: 'var x\nvar y\n\nx := 1\ny := x',
    funcDec: 'var y\n\ndef foo(var x) {\n\treturn x\n}\n\ny := foo(1)',
    input: 'var x\nx := read(): @high\n\nwrite(x): @low'
  };

  selectedTab = 0;


  @ViewChild('astNetwork')
  astNetwork: ElementRef;

  @ViewChild('dfgNetwork')
  dfgNetwork: ElementRef;

  text = '';

  constructor(private http: HttpClient) {
    // this.d3 = d3Service.getD3();
    // this.parentNativeElement = element.nativeElement;
  }

  handleAST(code) {
    this.hasInterference = null;
    // const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post('http://localhost:28288/api/lint', JSON.stringify(code), { headers: this.headers }).subscribe(lintData => {
      let lintResult = lintData as object[];
      if (lintResult.length === 0) {
        this.handleNI(code);
        this.http.post('http://localhost:28288/api/ast', JSON.stringify(code), { headers: this.headers }).subscribe(astData => {
          let treeNodes = [];
          let treeEdges = [];
          for (let i = 0; i < (astData['graph']['nodes']).length; i++) {
            const nodeData = astData['graph']['nodes'][i];
            treeNodes[i] = {
              // children: [],
              id: nodeData['id'],
              label: nodeData['label']
            };
          }
          treeNodes[0]['level'] = 0;
          for (let i = 0; i < (astData['graph']['edges']).length; i++) {
            const edgeData = astData['graph']['edges'][i];
            treeEdges[i] = {
              from: Number(edgeData['source']),
              to: Number(edgeData['target'])
            };

            const source = treeNodes.filter(function (node) {
              return node['id'] === edgeData['source'];
            })[0];
            treeNodes[Number(edgeData['target'])]['level'] = Number(source['level']) + 1;
          }

          let container = document.getElementById('astNetwork');
          let data = {
            nodes: treeNodes,
            edges: treeEdges
          };
          let options = {
            autoResize: true,
            edges: {
              smooth: {
                type: 'cubicBezier',
                forceDirection: 'horizontal',
                roundness: 0.4
              }
            },
            interaction: {
              navigationButtons: true
              // zoomView: false
            },
            height: (window.screen.height) + 'px',
            width: '100%',
            layout: {
              hierarchical: {
                parentCentralization: false,
                direction: 'UD'
              }
            },
            physics: false
          };
          let network = new Network(container, data, options);
          let viewNodes = treeNodes.filter(function (node) {
            return node['level'] === 0 || node['level'] === 1;
          }).map(function (node) {
            return node['id'];
          });

          network.fit({
            animation: true,
            nodes: viewNodes
          });

          network.once('initRedraw', function () {
            network.moveTo({
              offset: network.getViewPosition()
            });
          });
          // this.tree = treeNodes[0];
        });
      } else {

        this.editor.getEditor().getSession().setAnnotations((lintData as Object[]).map(function (error) {
          return {
            row: error['row'],
            text: error['reason'],
            type: (error['level'] as string).toLocaleLowerCase()
          };
        }));
      }
    });
  }

  handleDFG(code) {
    this.hasInterference = null;
    // const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post('http://localhost:28288/api/lint', JSON.stringify(code), { headers: this.headers }).subscribe(lintData => {
      let lintResult = lintData as object[];
      if (lintResult.length === 0) {
        this.handleNI(code);
        this.http.post('http://localhost:28288/api/dfg', JSON.stringify(code), { headers: this.headers }).subscribe(dfgData => {
          let treeNodes = [];
          let treeEdges = [];
          console.log(dfgData['graph']['edges'])
          console.log(dfgData['graph']['nodes'])
          for (let i = 0; i < (dfgData['graph']['nodes']).length; i++) {
            const nodeData = dfgData['graph']['nodes'][i];
            treeNodes[i] = {
              // children: [],
              group: nodeData['groupId'],
              id: nodeData['id'],
              label: nodeData['label']
            };
          }

          for (let i = 0; i < (dfgData['graph']['edges']).length; i++) {
            const edgeData = dfgData['graph']['edges'][i];
            treeEdges[i] = {
              from: edgeData['source'],
              to: edgeData['target']
            };
          }

          let container = document.getElementById('dfgNetwork');
          let data = {
            nodes: treeNodes,
            edges: treeEdges
          };
          let options = {
            autoResize: true,
            edges: {
              arrows: {
                to: true
              },
              smooth: {
                type: 'cubicBezier',
                forceDirection: 'horizontal',
                roundness: 0.4
              }
            },
            interaction: {
              navigationButtons: true
              // zoomView: false
            },
            height: (window.screen.height) + 'px',
            width: '100%',
            physics: true
          };
          let network = new Network(container, data, options);
          // let viewNodes = treeNodes.filter(function (node) {
          //   return node['level'] === 0 || node['level'] === 1;
          // }).map(function (node) {
          //   return node['id'];
          // });

          // network.fit({
          //   animation: true,
          //   nodes: viewNodes
          // });

          network.once('initRedraw', function () {
            network.moveTo({
              offset: network.getViewPosition()
            });
          });
          // this.tree = treeNodes[0];
        });
      } else {
        this.editor.getEditor().getSession().setAnnotations((lintData as Object[]).map(function (error) {
          return {
            row: error['row'],
            text: error['reason'],
            type: (error['level'] as string).toLocaleLowerCase()
          };
        }));
      }
    });
  }

  handleNI(code) {
    this.http.post('http://localhost:28288/api/ni', JSON.stringify(code), { headers: this.headers }).subscribe(niData => {
      this.hasInterference = niData['hasInterference'];
    });
  }

  interferenceText() {
    let result = '';
    if (this.hasInterference === true) {
      result = 'Interference';
    } else if (this.hasInterference === false) {
      result = 'No interference';
    }
    return result;
  }

  onChange(code) {
    localStorage.setItem('code', code);
    if (this.selectedTab === 0) {
      this.handleAST(code);
    } else if (this.selectedTab === 1) {
      this.handleDFG(code);
    }
  }

  ngAfterViewInit() {
    this.editor.setTheme('monokai');
    // this.canvasWidth = this.astNetwork.nativeElement.offsetWidth;
    // this.canvasHeight = this.astNetwork.nativeElement.offsetHeight;
    // this.canvasWidth = this.dfgNetwork.nativeElement.offsetWidth;
    // this.canvasHeight = this.dfgNetwork.nativeElement.offsetHeight;

    this.editor.getEditor().setOptions({
      // enableBasicAutocompletion: true
      printMargin: false
    });

    this.editor.getEditor().commands.addCommand({
      name: 'showOtherCompletions',
      bindKey: 'Ctrl-.',
      exec: function (editor) {

      }
    });
  }

  ngOnInit() {
    let storedCode = localStorage.getItem('code');

    if (storedCode) {
      this.setCode(storedCode);
    } else {
      this.setCode(this.codeExamples['assignment']);
    }
  }

  resendCode() {
    this.onChange(this.text);
  }

  // resetCode() {
  //   this.setCode( this.codeExamples['default']);
  // }

  selectedTabChange(event) {
    this.onChange(this.text);
  }

  setCode(code) {
    this.text = code;
    if (this.text) {
      this.onChange(this.text);
    }
  }
}