import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {affectedTrials,matchesAuditedWav} from '../audio/waveform-integrity.mjs';
import {getAssetLock} from '../lib/catalog.mjs';
import {assembleDashboardData} from '../tools/dashboard-data.mjs';
import {renderReport} from '../tools/report.mjs';
const read = async path => JSON.parse(await readFile(new URL(path,import.meta.url)));
const audit = await read('../diagnostics/audio8-waveform/evidence.json');
const fetchReceipt = id => read(`../results/${id}/result.json`);
const gpu = await fetchReceipt(audit.webgpu.resultId);
const cpu = await fetchReceipt(audit.cpu.resultId);
const interrupted = await fetchReceipt('2026-11-15t06-00-59-478z-audio8-realistic-0.6b-int4-webgpu-warm-8a08bc92');
const id = cpu.cells[0].model;
const models = {[id]:getAssetLock().models[id]};

test('hosted interval evidence covers exact audited samples and matches native PCM and WAV identities', () => {
  for(const [backend,receipt] of [['cpu',cpu],['webgpu',gpu]]) {
    const evidence=audit[backend], trial=receipt.cells[0].trials[0];
    assert.equal(evidence.pcmSha256,trial.pcmSha256);
    assert.equal(evidence.wavSha256,trial.audio.sha256);
    assert.equal(evidence.samples,trial.samples);
    assert.equal(matchesAuditedWav(evidence.wavSha256),backend==='webgpu');
    assert.equal(affectedTrials(receipt.cells[0]).length,backend==='webgpu'?1:0);
    let end=0;
    const samples=evidence.intervalsAtLeastOneSecond.reduce((sum,row)=>{
      assert.ok(row.startSample>=end && row.samples>=evidence.rate);
      assert.equal(row.endSampleExclusive-row.startSample,row.samples);
      end=row.endSampleExclusive;
      return sum+row.samples;
    },0);
    assert.equal(samples,evidence.thresholdsSamples[String(evidence.rate)].samples);
  }
  assert.equal(audit.webgpu.intervalsAtLeastOneSecond.length,93);
  assert.equal(audit.cpu.thresholdsSamples['4410'].runs,0);
  assert.equal((100*audit.webgpu.thresholdsSamples['44100'].samples/audit.webgpu.samples).toFixed(2),'90.31');
});

test('original GPU resource timing and stopped trial remain inspectable while CPU evidence stays separate', () => {
  const [row]=assembleDashboardData({models,results:[gpu,cpu,interrupted]}).models;
  assert.equal(row.memory.webgpu.status,'measured');
  assert.equal(row.memory.webgpu.waveform.diagnosticSeconds[0],gpu.cells[0].trials[0].generationMs/1000);
  assert.ok(row.memory.webgpu.meanMB>0);
  assert.equal(row.memory.cpu.waveform,undefined);
  assert.equal(row.warm.webgpu.status,'error');
  assert.equal(row.warm.webgpu.medianSeconds,null);
  assert.equal(row.warm.webgpu.waveform.diagnosticSeconds.length,1);
  assert.equal(row.pairedWarm,false);
  assert.match(renderReport(interrupted).markdown,/8?413\.724 s/);
  assert.doesNotMatch(renderReport(cpu).markdown,/Waveform fault/);
});

test('only scored matching audio is excluded from warm rankings', () => {
  // Exercise the eligible timing path in memory using archived observations.
  const fixture=structuredClone(interrupted), cell=fixture.cells[0];
  cell.status='measured';
  const assemble=()=>assembleDashboardData({models,results:[fixture]}).models[0].warm.webgpu;
  assert.equal(assemble().medianSeconds,null);
  assert.equal(assemble().displayStatus,'Diagnostic PCM');
  cell.trials=[cpu.cells[0].trials[0]];
  assert.equal(assemble().medianSeconds,cell.trials[0].generationMs/1000);
  assert.equal(assemble().waveform,undefined);
});
