//! Service resource/expiry checks use only fictional in-memory documents.
use anyhow::Result;
use rustpad_server::{server, ServerConfig};
use serde_json::json;
use std::time::Duration;
mod common;
use common::*;

#[tokio::test]
async fn document_slots_are_bounded_and_released_on_expiry() -> Result<()> {
    let filter = server(ServerConfig::default());
    let mut clients = Vec::new();
    for i in 0..64 { clients.push(connect(&filter, &format!("fictional-{i}")).await?); }
    assert!(connect(&filter, "fictional-over-limit").await.is_err());
    tokio::time::pause();
    tokio::time::advance(Duration::from_secs(26 * 3600)).await;
    tokio::task::yield_now().await;
    assert!(connect(&filter, "fictional-after-expiry").await.is_ok());
    Ok(())
}

#[tokio::test]
async fn connection_slots_are_bounded_and_released_on_close() -> Result<()> {
    let filter = server(ServerConfig::default());
    let mut clients = Vec::new();
    for _ in 0..128 { clients.push(connect(&filter, "fictional-shared").await?); }
    assert!(connect(&filter, "fictional-shared").await.is_err());
    drop(clients.pop());
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert!(connect(&filter, "fictional-shared").await.is_ok());
    Ok(())
}

#[tokio::test]
async fn editing_does_not_refresh_native_connection_expiry() -> Result<()> {
    let filter = server(ServerConfig::default());
    let mut client = connect(&filter, "fictional-expiry").await?;
    client.recv().await?;
    tokio::time::pause();
    tokio::time::advance(Duration::from_secs(23 * 3600)).await;
    client.send(&json!({"Edit":{"revision":0,"operation":["fictional"]}})).await;
    client.recv().await?;
    expect_text(&filter, "fictional-expiry", "fictional").await;
    tokio::time::advance(Duration::from_secs(3 * 3600)).await;
    tokio::task::yield_now().await;
    expect_text(&filter, "fictional-expiry", "").await;
    Ok(())
}

#[tokio::test]
async fn metadata_and_message_rate_disconnect_only_offender() -> Result<()> {
    let filter = server(ServerConfig::default());
    let mut client = connect(&filter, "fictional-meta").await?;
    client.recv().await?;
    client.send(&json!({"ClientInfo":{"name":"x".repeat(129),"hue":0}})).await;
    client.recv_closed().await?;
    let mut fast = connect(&filter, "fictional-rate").await?;
    fast.recv().await?;
    for _ in 0..101 {
        fast.send(&json!({"SetLanguage":"plaintext"})).await;
        if fast.recv().await.is_err() { return Ok(()); }
    }
    panic!("101 messages in one second must close the socket");
}
