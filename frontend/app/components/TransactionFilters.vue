<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '~/stores/dashboard';

const store = useDashboardStore();
const { agents, filters, isLoading } = storeToRefs(store);
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Filters</p>
        <h2>Search, filters, and sorting</h2>
      </div>
      <button class="ghost-button" @click="store.resetFilters()">
        Reset
      </button>
    </div>

    <div class="filters-grid">
      <label>
        <span>Search</span>
        <input v-model="filters.search" type="text" placeholder="Property ref or agent">
      </label>
      <label>
        <span>Stage</span>
        <select v-model="filters.stage">
          <option value="">All</option>
          <option value="agreement">Agreement</option>
          <option value="earnest_money">Earnest Money</option>
          <option value="title_deed">Title Deed</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <label>
        <span>Currency</span>
        <select v-model="filters.currency">
          <option value="">All</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="TRY">TRY</option>
          <option value="GBP">GBP</option>
        </select>
      </label>
      <label>
        <span>Agent</span>
        <select v-model="filters.agentId">
          <option value="">All</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }}
          </option>
        </select>
      </label>
      <label>
        <span>Sort By</span>
        <select v-model="filters.sortBy">
          <option value="updatedAt">Updated At</option>
          <option value="createdAt">Created At</option>
          <option value="totalServiceFee">Total Service Fee</option>
        </select>
      </label>
      <label>
        <span>Order</span>
        <select v-model="filters.order">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </label>
    </div>

    <div class="filters-actions">
      <button class="primary-button" :disabled="isLoading" @click="store.loadDashboard()">
        {{ isLoading ? 'Loading...' : 'Apply Filters' }}
      </button>
    </div>
  </section>
</template>
