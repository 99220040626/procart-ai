package com.procart.config;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public class MasterReplicaRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        // Intercept the transaction. Is it read-only? (e.g., searching for products)
        boolean isReadOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        
        if (isReadOnly) {
            System.out.println("🔀 [DB ROUTER] Read-Only Query Detected -> Routing to REPLICA database.");
            return "REPLICA";
        } else {
            System.out.println("🔀 [DB ROUTER] Write Query Detected -> Routing to MASTER database.");
            return "MASTER";
        }
    }
}