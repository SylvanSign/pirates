defmodule Pirates.GameServer.StateTicker do
  use GenServer

  @name __MODULE__
  @ticks_per_second 60
  @tick_timer_in_ms div(1 * 1_000, @ticks_per_second)

  ##############
  # Client API #
  ##############

  def start_link do
    GenServer.start_link(@name, :ok, name: @name)
  end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
    {:ok, _} = :timer.send_interval(@tick_timer_in_ms, :tick)
    {:ok, Pirates.GameServer.Instance.table}
  end

  def handle_info(:tick, table) do
    {pids, states} = Pirates.GameServer.Instance.state(table)
    pids |> Enum.each(fn pid -> send(pid, {:state_tick, states}) end)
    {:noreply, table}
  end

  # handle any unexpected mail
  def handle_info(_msg, table) do
    {:noreply, table}
  end
end
